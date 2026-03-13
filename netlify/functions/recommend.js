// ============================================================
// netlify/functions/recommend.js
// Rate limiting: 20 searches/day per IP (via Upstash Redis)
// ============================================================

const DAILY_LIMIT = 20;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ---- IP Rate Limiting (Upstash Redis) ----
  const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const ip =
      event.headers['x-forwarded-for']?.split(',')[0].trim() ||
      event.headers['client-ip'] ||
      'unknown';

    const key = `pagematch:${ip}:${todayKey()}`;

    try {
      // Increment count and set 24h expiry
      const incrResp = await upstash(UPSTASH_URL, UPSTASH_TOKEN, ['INCR', key]);
      const count = incrResp.result;

      if (count === 1) {
        // First request today — set expiry to end of day
        await upstash(UPSTASH_URL, UPSTASH_TOKEN, ['EXPIRE', key, 86400]);
      }

      if (count > DAILY_LIMIT) {
        return {
          statusCode: 429,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: `Daily limit reached. You can make ${DAILY_LIMIT} searches per day. Please come back tomorrow!`,
            limitReached: true,
            remaining: 0,
          }),
        };
      }

      const remaining = DAILY_LIMIT - count;

    } catch (e) {
      // If Redis is down, allow the request through (fail open)
      console.error('Redis error:', e.message);
    }
  }

  // ---- Parse request ----
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured on server.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { mode, query, options } = body;
  if (!mode || !query) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing mode or query.' }) };
  }

  // ---- Call Gemini ----
  const prompt = buildPrompt(mode, query, options || {});
  const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  let lastError;

  for (const model of MODELS) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        const msg = err?.error?.message || `API error ${resp.status}`;
        const isQuota = resp.status === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
        if (isQuota) { lastError = msg; continue; }
        return { statusCode: resp.status, body: JSON.stringify({ error: msg }) };
      }

      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const recs = JSON.parse(clean);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recs),
      };

    } catch (e) {
      lastError = e.message;
    }
  }

  return {
    statusCode: 429,
    body: JSON.stringify({ error: 'All models hit quota. Please wait a minute and try again.' }),
  };
};

// ---- Upstash Redis helper ----
async function upstash(url, token, command) {
  const resp = await fetch(`${url}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  return resp.json();
}

// ---- Today's date key (YYYY-MM-DD) ----
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ---- Prompt builder ----
function buildPrompt(mode, query, options) {
  const jsonShape = `Return ONLY a valid JSON array — no markdown fences, no extra text:
[{ "title": "Book Title", "author": "Author Name", "why": "2-sentence reason.", "tags": ["tag1","tag2","tag3"] }]`;

  if (mode === 'book') {
    const extras = [];
    if (options.series)   extras.push('include sequels or series continuations where relevant');
    if (options.classics) extras.push('include at least one classic novel');
    const extraStr = extras.length ? ` Also: ${extras.join(', ')}.` : '';
    return `I just finished reading "${query}". Recommend 6 books I should read next based on its themes, writing style, and mood.${extraStr}\n\n${jsonShape}`;
  }

  if (mode === 'author') {
    if (options.sameAuthor) {
      return `Recommend 6 of the best books written by "${query}". Pick across their career — a good mix of celebrated and underrated works.\n\n${jsonShape}`;
    }
    return `I love the author "${query}". Recommend 6 books: include 2–3 of their own best works I might have missed, plus 3–4 books by different authors with a very similar writing style, tone, or themes.\n\n${jsonShape}`;
  }

  if (mode === 'genre') {
    const extras = [];
    if (options.classics) extras.push('include at least one classic');
    const extraStr = extras.length ? ` Also: ${extras.join(', ')}.` : '';
    return `Recommend 6 excellent books in this genre or style: "${query}".${extraStr} Pick standout titles — a mix of beloved and hidden gems.\n\n${jsonShape}`;
  }
}