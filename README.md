# Doula Contract Hub

Payer contract strategy builder and redlining tool for doula services organizations in California and Washington.

---

## Deploy to Vercel in ~10 minutes

### Step 1 — Get a free Vercel account
Go to https://vercel.com and sign up with GitHub (recommended) or email.

### Step 2 — Install the Vercel CLI (optional but fastest)
```bash
npm install -g vercel
```

### Step 3 — Get your Anthropic API key
Go to https://console.anthropic.com → API Keys → Create Key.
Copy it — you'll need it in Step 5.

### Step 4 — Deploy

**Option A: CLI (fastest)**
```bash
cd doula-contract-hub
npm install
vercel
# Follow the prompts — accept all defaults
```

**Option B: GitHub (recommended for teams)**
1. Push this folder to a new GitHub repo
2. Go to https://vercel.com/new
3. Import your repo
4. Click Deploy (defaults are fine)

### Step 5 — Add your API key as an environment variable
In the Vercel dashboard:
1. Go to your project → Settings → Environment Variables
2. Add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (your key from Step 3)
   - Environment: Production + Preview + Development
3. Click Save, then go to Deployments → Redeploy

### Step 6 — Lock down CORS (important before sharing)
Add another environment variable:
- Name: `ALLOWED_ORIGINS`
- Value: `https://your-actual-domain.vercel.app` (your Vercel URL)

This prevents other sites from using your API key.

### Step 7 — Your app is live!
Vercel gives you a URL like `https://doula-contract-hub-xyz.vercel.app`.
Share it with your team.

---

## Running locally for development

```bash
npm install
# Create a .env.local file:
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env.local
echo "ALLOWED_ORIGINS=http://localhost:3000" >> .env.local
vercel dev
# Opens at http://localhost:3000
```

---

## Folder structure

```
doula-contract-hub/
├── api/
│   └── claude.js        ← Serverless function (API key lives here)
├── public/
│   └── index.html       ← Full frontend app
├── vercel.json          ← Routing config
├── package.json
└── README.md
```

---

## Next steps (when you're ready to grow)

### Add user authentication
Use Clerk (https://clerk.com) — free tier, drops in as middleware:
```bash
npm install @clerk/clerk-sdk-node
```
Wrap the handler in `api/claude.js` with `requireAuth()`.

### Save contract history
Use Supabase (https://supabase.com) — free tier includes a Postgres database.
Create a `contracts` table and insert a row after each redline run.

### Add PDF export
Use `html2pdf.js` on the frontend to let users download redline results.

### Add team access
Set up Vercel Teams and invite colleagues — they all share the same deployment.

### Rate limiting at scale
Replace the in-memory rate limiter in `api/claude.js` with Upstash Redis:
```bash
npm install @upstash/redis
```
See https://upstash.com for a free Redis instance that works natively with Vercel.

---

## Cost estimate

| Item | Cost |
|------|------|
| Vercel hosting | Free (Hobby plan) |
| Anthropic API — strategy | ~$0.01–0.03 per run |
| Anthropic API — redline | ~$0.02–0.05 per run |
| 100 runs/month | ~$2–5/month |

---

## Support
For questions about the codebase, bring this README and the source files back to Claude.
