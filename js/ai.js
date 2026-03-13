// ============================================================
// js/ai.js  —  calls our Netlify serverless function
// API key is safely stored on the server, never exposed here
// ============================================================

const Claude = (() => {

  async function getRecommendations(mode, query, options = {}) {
    const resp = await fetch('/.netlify/functions/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, query, options }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || `Server error ${resp.status}`);
    }

    return data;
  }

  return { getRecommendations };
})();
