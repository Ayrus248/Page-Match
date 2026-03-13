# PageMatch — Book Recommender
## Complete Setup Guide

---

## What's in this folder

```
pagematch/
├── index.html          ← Main webpage
├── css/
│   └── style.css       ← All styles (mobile + desktop)
├── js/
│   ├── config.js       ← ⭐ Your API key goes here
│   ├── claude.js       ← Talks to Anthropic / Claude AI
│   ├── reddit.js       ← Fetches Reddit threads (no key needed)
│   └── app.js          ← Main app logic
└── README.md           ← This file
```

---

## Step 1 — Get an Anthropic API Key

1. Go to **https://console.anthropic.com**
2. Sign up or log in
3. Click **"API Keys"** in the left sidebar
4. Click **"Create Key"**, give it a name like `pagematch`
5. **Copy** the key — it starts with `sk-ant-...`
6. ⚠️ Store it safely — you can only see it once

---

## Step 2 — Add your API Key

1. Open `js/config.js` in any text editor (Notepad, VS Code, etc.)
2. Find this line:
   ```
   ANTHROPIC_API_KEY: 'YOUR_API_KEY_HERE',
   ```
3. Replace `YOUR_API_KEY_HERE` with your actual key:
   ```
   ANTHROPIC_API_KEY: 'sk-ant-api03-xxxxxxxxxxxxxxxx',
   ```
4. Save the file

---

## Step 3 — Run the website locally

### Option A — The simplest way (VS Code)
1. Install **VS Code**: https://code.visualstudio.com
2. Install the **Live Server** extension (search in Extensions panel)
3. Open the `pagematch` folder in VS Code
4. Right-click `index.html` → **"Open with Live Server"**
5. Your browser opens at `http://127.0.0.1:5500`

### Option B — Python (if you have Python installed)
1. Open Terminal / Command Prompt
2. Navigate to the pagematch folder:
   ```bash
   cd path/to/pagematch
   ```
3. Run:
   ```bash
   # Python 3
   python -m http.server 8080
   ```
4. Open **http://localhost:8080** in your browser

### Option C — Node.js
1. Install Node.js: https://nodejs.org
2. In Terminal, navigate to the folder:
   ```bash
   cd path/to/pagematch
   npx serve .
   ```
3. Open the URL shown in Terminal

> ⚠️ **Important:** You must use a local server (not just double-click index.html).
> Browsers block API calls from `file://` URLs for security reasons.

---

## Step 4 — Deploy it live (so anyone can use it)

### Option A — Netlify (Easiest, Free)
1. Go to **https://netlify.com** and sign up (free)
2. Drag & drop your `pagematch` folder onto the Netlify dashboard
3. Your site is live instantly at a URL like `https://quirky-name-123.netlify.app`
4. You can set a custom domain in settings

### Option B — GitHub Pages (Free)
1. Create a free account at **https://github.com**
2. Create a new repository called `pagematch`
3. Upload all your files (drag & drop in the browser UI)
4. Go to **Settings → Pages → Source → main branch**
5. Your site is live at `https://yourusername.github.io/pagematch`

### Option C — Vercel (Free)
1. Go to **https://vercel.com** and sign up
2. Connect your GitHub account
3. Import the `pagematch` repository
4. Click Deploy — done

---

## ⚠️ Security Note

Your API key is in `js/config.js` which is a public file. This is fine for:
- Personal use / demos
- Testing on localhost

For a **real public website** with many users, you should:
1. Move the API call to a backend (e.g. a Netlify Function or Vercel Edge Function)
2. Keep the API key in environment variables on the server
3. Never expose the key in client-side JS

---

## Customisation Tips

| What to change | Where |
|---|---|
| Site name / branding | `index.html` — `.logo` and `<title>` |
| Colours | `css/style.css` — `:root` variables at the top |
| Number of recommendations | `js/claude.js` — change `6` in the prompt |
| Reddit subreddits to search | `js/reddit.js` — `SUBREDDITS` array |
| AI model used | `js/config.js` — `MODEL` field |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "No API key found" error | Open `js/config.js` and paste your key |
| Blank page | Make sure you're using a local server, not `file://` |
| CORS error | Same as above — use a local server |
| Reddit shows no threads | Try a more popular book title |
| API 401 error | Check your API key is correct and not expired |

---

## Reddit API — How it works

Reddit exposes a **free public JSON API** — no account or key needed.

The app queries:
- `reddit.com/r/books/search.json?q=BOOK+recommendations`
- `reddit.com/r/booksuggestions/search.json?q=BOOK+recommendations`

You can add more subreddits (e.g. `r/Fantasy`, `r/scifi`) by editing the `SUBREDDITS` array in `js/reddit.js`.
