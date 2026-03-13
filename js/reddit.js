// ============================================================
// js/reddit.js  —  Reddit public JSON API (no key needed)
// ============================================================

const Reddit = (() => {

  const SUBREDDITS = ['books', 'booksuggestions'];

  async function fetchThreads(book) {
    const query = encodeURIComponent(`${book} recommendations`);
    const allThreads = [];

    for (const sub of SUBREDDITS) {
      try {
        const url = `https://www.reddit.com/r/${sub}/search.json?q=${query}&sort=relevance&limit=4&restrict_sr=1&t=all`;
        const resp = await fetch(url, {
          headers: { 'Accept': 'application/json' },
        });
        if (!resp.ok) continue;

        const data = await resp.json();
        const posts = data?.data?.children || [];

        for (const post of posts) {
          const p = post.data;
          allThreads.push({
            title:     p.title,
            url:       `https://reddit.com${p.permalink}`,
            subreddit: p.subreddit_name_prefixed,
            score:     p.score,
            comments:  p.num_comments,
            snippet:   p.selftext ? p.selftext.slice(0, 220) : '',
            date:      new Date(p.created_utc * 1000).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short'
            }),
          });
        }
      } catch (_) {
        // silently skip a subreddit if it fails
      }
    }

    // de-duplicate by URL and return top 6
    const seen = new Set();
    return allThreads.filter(t => {
      if (seen.has(t.url)) return false;
      seen.add(t.url);
      return true;
    }).slice(0, 6);
  }

  return { fetchThreads };
})();
