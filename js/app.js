// ============================================================
// js/app.js  —  UI controller with localStorage rate limiting
// ============================================================

const App = (() => {

  const DAILY_LIMIT = 20;
  let currentMode = 'book';

  const $ = id => document.getElementById(id);

  // ---- localStorage rate limit ----
  function getUsage() {
    const today = new Date().toISOString().slice(0, 10);
    const stored = JSON.parse(localStorage.getItem('pagematch_usage') || '{}');
    if (stored.date !== today) return { date: today, count: 0 };
    return stored;
  }

  function incrementUsage() {
    const usage = getUsage();
    usage.count += 1;
    localStorage.setItem('pagematch_usage', JSON.stringify(usage));
    return usage.count;
  }

  function getRemainingSearches() {
    return Math.max(0, DAILY_LIMIT - getUsage().count);
  }

  function updateCounter() {
    const remaining = getRemainingSearches();
    const el = $('search-counter');
    if (!el) return;
    el.textContent = `${remaining} of 20 searches left today`;
    el.className = 'search-counter-bar' + (remaining <= 5 ? ' counter-low' : '');
  }

  // ---- Mode switching ----
  function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    ['book', 'author', 'genre'].forEach(m => {
      $(`panel-${m}`).classList.toggle('hidden', m !== mode);
    });
    const inputId = { book: 'input-book', author: 'input-author', genre: 'input-genre' }[mode];
    setTimeout(() => $(inputId)?.focus(), 50);
    $('results').classList.add('hidden');
    clearError();
  }

  // ---- Genre pills ----
  function setGenre(el) {
    document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
    $('input-genre').value = el.textContent;
  }

  // ---- Query & options ----
  function getQuery() {
    return { book: 'input-book', author: 'input-author', genre: 'input-genre' }[currentMode];
  }

  function getOptions() {
    if (currentMode === 'book')   return { reddit: $('opt-reddit').checked,        series: $('opt-series').checked,      classics: $('opt-classics').checked };
    if (currentMode === 'author') return { reddit: $('opt-reddit-author').checked,  sameAuthor: $('opt-same-author').checked };
    if (currentMode === 'genre')  return { reddit: $('opt-reddit-genre').checked,   classics: $('opt-classics-genre').checked };
  }

  // ---- Helpers ----
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function setStatus(msg) { $('status-text').textContent = msg; }
  function showStatus(v)  { $('status-bar').classList.toggle('hidden', !v); }
  function showError(msg) { $('error-box').innerHTML = msg; $('error-box').classList.remove('hidden'); }
  function clearError()   { $('error-box').classList.add('hidden'); }

  function setLoading(v) {
    const btn = document.querySelector('.mode-panel:not(.hidden) .btn-primary');
    if (btn) { btn.disabled = v; btn.textContent = v ? 'Searching…' : 'Find Books'; }
  }

  const LABELS = {
    book:   { title: 'Recommended for you',    badge: 'Similar books' },
    author: { title: 'Books you might love',   badge: 'By author & similar' },
    genre:  { title: 'Top picks in this genre', badge: 'Genre picks' },
  };

  // ---- Render recommendations ----
  function renderRecs(recs) {
    $('recs-grid').innerHTML = recs.map((r, i) => `
      <article class="rec-card">
        <span class="rec-number">#${i + 1}</span>
        <h3 class="rec-title">${esc(r.title)}</h3>
        <p class="rec-author">by ${esc(r.author)}</p>
        <p class="rec-why">${esc(r.why)}</p>
        ${r.tags?.length ? `<div class="rec-tags">${r.tags.map(t => `<span class="rec-tag">${esc(t)}</span>`).join('')}</div>` : ''}
      </article>
    `).join('');
    $('results-title').textContent = LABELS[currentMode].title;
    $('results-badge').textContent = LABELS[currentMode].badge;
  }

  // ---- Render Reddit ----
  function renderReddit(threads) {
    const list = $('reddit-threads');
    if (!threads.length) {
      list.innerHTML = '<p class="no-reddit">No Reddit threads found — try a more popular title!</p>';
    } else {
      list.innerHTML = threads.map(t => `
        <a class="thread-card" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">
          <div class="thread-title">${esc(t.title)}</div>
          <div class="thread-meta">
            <span>${esc(t.subreddit)}</span>
            <span>▲ ${Number(t.score).toLocaleString()}</span>
            <span>💬 ${Number(t.comments).toLocaleString()}</span>
            <span>${esc(t.date)}</span>
          </div>
          ${t.snippet ? `<div class="thread-snippet">${esc(t.snippet)}</div>` : ''}
        </a>
      `).join('');
    }
    $('reddit-section').classList.remove('hidden');
    $('reddit-divider').classList.remove('hidden');
  }

  // ---- Main search ----
  async function search() {
    const inputId = getQuery();
    const query = $(inputId)?.value.trim();
    if (!query) { $(inputId)?.focus(); return; }

    // --- localStorage check ---
    if (getRemainingSearches() <= 0) {
      showError('⚠ You\'ve reached your <strong>10 searches for today</strong>. Come back tomorrow!');
      return;
    }

    const opts = getOptions();
    clearError();
    $('results').classList.add('hidden');
    $('reddit-section').classList.add('hidden');
    $('reddit-divider').classList.add('hidden');
    $('recs-grid').innerHTML = '';
    $('reddit-threads').innerHTML = '';

    setLoading(true);
    showStatus(true);

    try {
      setStatus('Asking AI for book recommendations…');
      const recs = await Claude.getRecommendations(currentMode, query, opts);

      // Increment only on success
      incrementUsage();
      updateCounter();

      renderRecs(recs);

      if (opts.reddit) {
        setStatus('Fetching Reddit discussions…');
        const redditQuery = currentMode === 'author' ? `${query} books recommendations`
          : currentMode === 'genre' ? `${query} book recommendations` : query;
        const threads = await Reddit.fetchThreads(redditQuery);
        renderReddit(threads);
      }

      showStatus(false);
      $('results').classList.remove('hidden');
      $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      showStatus(false);
      const msg = err.message || 'Something went wrong. Please try again.';
      // If server says limit reached, update local counter too
      if (msg.includes('Daily limit')) {
        localStorage.setItem('pagematch_usage', JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: DAILY_LIMIT }));
        updateCounter();
      }
      showError('⚠ ' + msg);
    } finally {
      setLoading(false);
    }
  }

  // ---- Keyboard enter ----
  ['input-book', 'input-author', 'input-genre'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') search();
    });
  });

  // ---- Init ----
  updateCounter();

  return { search, switchMode, setGenre };
})();