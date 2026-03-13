PageMatch — Book Recommender
AI-powered book recommendations based on books you've read, favourite authors, or genres — with real Reddit community discussions.
Live demo: your-site.netlify.app
---
Features
By Book — enter a book you read, get 6 similar recommendations
By Author — discover more books by the same author or similar authors
By Genre — pick a genre or mood and get tailored suggestions
Reddit threads — real community discussions fetched alongside every search
Fully responsive — works on mobile and desktop
---
Tech Stack
Plain HTML, CSS, JavaScript — no frameworks
Gemini AI — free AI recommendations
Reddit public API — community threads, no key needed
Netlify Functions — serverless backend to keep the API key safe
---
Project Structure
```
pagematch/
├── index.html                  ← Main webpage
├── netlify.toml                ← Netlify config
├── css/
│   └── style.css               ← All styles (mobile + desktop)
├── js/
│   ├── ai.js                   ← Calls the serverless function
│   ├── reddit.js               ← Fetches Reddit threads
│   └── app.js                  ← UI logic
└── netlify/
    └── functions/
        └── recommend.js        ← Serverless function (API key lives here)
```
---
Local Development
1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/pagematch.git
cd pagematch
```
2. Get a free Gemini API key
Go to aistudio.google.com
Click "Get API Key" → "Create API key"
Copy the key
3. Install Netlify CLI
```bash
npm install -g netlify-cli
```
4. Set your API key locally
```bash
netlify env:set GEMINI_API_KEY your_key_here
```
Or create a `.env` file in the root:
```
GEMINI_API_KEY=your_key_here
```
5. Run locally
```bash
netlify dev
```
Open http://localhost:8888
> Using `netlify dev` is required locally — it runs the serverless function alongside the site.
---
Deployment (GitHub + Netlify)
1. Push to GitHub
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pagematch.git
git push -u origin main
```
2. Connect to Netlify
Go to netlify.com → "Add new site" → "Import an existing project"
Connect your GitHub account and select the `pagematch` repo
Leave build settings as default
Click "Deploy site"
3. Add your API key on Netlify
Go to Site configuration → Environment variables
Click "Add a variable"
Key: `GEMINI_API_KEY` · Value: your Gemini key
Click Save
4. Redeploy
Go to Deploys → "Trigger deploy" → "Deploy site"
Your site is now live and your API key is secure. Every future `git push` will auto-deploy.
---
Why is the API key safe?
The Gemini API key is stored as a Netlify environment variable — it never appears in any file users can access. All AI requests go through the serverless function at `/.netlify/functions/recommend`, which runs on Netlify's server.
---
Troubleshooting
Problem	Fix
Recommendations not loading	Check that `GEMINI_API_KEY` is set in Netlify environment variables
Works locally but not on Netlify	Trigger a fresh deploy after adding the environment variable
Reddit shows no threads	Try a more popular book or author name
Quota exceeded error	Wait a minute — free tier resets. App auto-retries with a backup model
`netlify dev` not found	Run `npm install -g netlify-cli` first
