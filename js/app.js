// ============================================================
// js/app.js  —  UI controller (3 modes: book / author / genre)
// ============================================================

const App = (() => {

  let currentMode = 'book';

  const $ = id => document.getElementById(id);

  // ---------- Mode switching ----------
  function switchMode(mode) {
    currentMode = mode;

    // update tab styles
    document.querySelectorAll('.mode-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // show/hide panels
    ['book', 'author', 'genre'].forEach(m => {
      $(`panel-${m}`).classList.toggle('hidden', m !== mode);
    });

    // focus the right input
    const inputId = { book: 'input-book', author: 'input-author', genre: 'input-genre' }[mode];
    setTimeout(() => $(`${inputId}`) && $(`${inputId}`).focus(), 50);

    // hide old results
    $('results').classList.add('hidden');
    clearError();
  }

  // ---------- Genre pill quick-select ----------
  function setGenre(el) {
    document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
    $('input-genre').value = el.textContent;
  }

  // ---------- Get current query & options ----------
  function getQuery() {
    return {
      book:   () => $('input-book').value.trim(),
      author: () => $('input-author').value.trim(),
      genre:  () => $('input-genre').value.trim(),
    }[currentMode]();
  }

  function getOptions() {
    if (currentMode === 'book') return {
      reddit:    $('opt-reddit').checked,
      series:    $('opt-series').checked,
      classics:  $('opt-classics').checked,
    };
    if (currentMode === 'author') return {
      reddit:     $('opt-reddit-author').checked,
      sameAuthor: $('opt-same-author').checked,
    };
    if (currentMode === 'genre') return {
      reddit:   $('opt-reddit-genre').checked,
      classics: $('opt-classics-genre').checked,
    };
  }

  // ---------- Result section labels ----------
  const LABELS = {
    book:   { title: 'Recommended for you',          badge: 'Similar books' },
    author: { title: 'Books you might love',          badge: 'By author & similar' },
    genre:  { title: 'Top picks in this genre',       badge: 'Genre picks' },
  };

  // ---------- Helpers ----------
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function setStatus(msg) { $('status-text').textContent = msg; }
  function showStatus(v)  { $('status-bar').classList.toggle('hidden', !v); }
  function showError(msg) { $('error-box').textContent = msg; $('error-box').classList.remove('hidden'); }
  function clearError()   { $('error-box').classList.add('hidden'); }

  function setLoading(v) {
    const btn = document.querySelector('.mode-panel:not(.hidden) .btn-primary');
    if (btn) { btn.disabled = v; btn.textContent = v ? 'Searching…' : 'Find Books'; }
  }

  // ---------- Render recommendations ----------
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

    const lbl = LABELS[currentMode];
    $('results-title').textContent = lbl.title;
    $('results-badge').textContent = lbl.badge;
  }

  // ---------- Render Reddit ----------
  function renderReddit(threads) {
    const sec = $('reddit-section');
    const div = $('reddit-divider');
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

    sec.classList.remove('hidden');
    div.classList.remove('hidden');
  }

  // ---------- Main search ----------
  async function search() {
    const query = getQuery();
    if (!query) {
      const inputId = { book: 'input-book', author: 'input-author', genre: 'input-genre' }[currentMode];
      $(inputId)?.focus();
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
      renderRecs(recs);

      if (opts.reddit) {
        setStatus('Fetching Reddit discussions…');
        const redditQuery = currentMode === 'author'
          ? `${query} books recommendations`
          : currentMode === 'genre'
          ? `${query} book recommendations`
          : query;
        const threads = await Reddit.fetchThreads(redditQuery);
        renderReddit(threads);
      }

      showStatus(false);
      $('results').classList.remove('hidden');
      $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      showStatus(false);
      showError('⚠ ' + (err.message || 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  // ---------- Keyboard enter ----------
  ['input-book', 'input-author', 'input-genre'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') search();
    });
  });

  return { search, switchMode, setGenre };
})();
