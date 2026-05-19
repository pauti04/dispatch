# Deploy playbook — Dispatch

Step-by-step from zero to live URLs. Total time: ~45 min if you've never used these services before, ~15 min if you have.

Three external services + two hosts. All have free tiers that cover Dispatch's first ~100 active users.

---

## 0. Prerequisites

- [ ] GitHub repo pushed (Render + Vercel both build from GitHub)
- [ ] Node 18+ locally (for the smoke test before deploying)
- [ ] One OpenAI API key with credit on it
- [ ] Decision made: which email address are you sending FROM? (`onboarding@resend.dev` is fine for launch; custom domain comes later)

---

## 1. Neon (Postgres) — 5 min

1. Go to [neon.tech](https://neon.tech) → sign up (GitHub login works)
2. Create a new project: name it `dispatch`, region close to you
3. After provisioning: click **Connection Details** → copy the **pooled** connection string (it ends in `-pooler.…`)
4. Save it somewhere — you'll paste it as `DATABASE_URL` in three places (local, Render web, Render cron)

**Sanity check:**
```bash
cd server
DATABASE_URL="postgres://...?sslmode=require" npm run migrate
```
Expected: lines like `applied: 001_init.sql` through `016_push_tokens.sql`. If you see `relation already exists`, that migration already ran — fine.

---

## 2. Resend (email) — 5 min

1. Go to [resend.com](https://resend.com) → sign up
2. **API Keys** → create one named `dispatch-prod` → copy it (starts with `re_…`)
3. For launch, use the default sender: `Dispatch <onboarding@resend.dev>`. No domain verification needed; you can send 3,000 emails / month.
4. Optional (later): add a custom domain. Resend gives you DNS records to paste into your registrar.

**Sanity check:**
```bash
curl -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"from":"onboarding@resend.dev","to":"YOUR_EMAIL","subject":"Resend test","html":"<p>hi</p>"}'
```
Expected: `{"id":"..."}`. Email arrives in <30s.

---

## 3. OpenAI — 2 min

You already have a key. Make sure the project has at least $5 of credit (Dispatch's first 100 users will burn ~$15/mo; first day of testing is a few cents).

---

## 4. Local smoke test BEFORE deploying — 10 min

Don't skip this. Catches 80% of deploy issues before they cost you a hot reload cycle.

```bash
# server/.env — fill in EVERY required var from .env.example
DATABASE_URL=postgres://...?sslmode=require       # from step 1
RESEND_API_KEY=re_...                              # from step 2
OPENAI_API_KEY=sk-...                              # your key
JWT_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)
APP_URL=http://localhost:5173
FROM_EMAIL="Dispatch <onboarding@resend.dev>"
ADMIN_EMAILS=your@email.com
```

Then:

```bash
cd server
npm install
npm run migrate          # idempotent — re-running is safe
npm run dev              # http://localhost:5180

# new terminal
cd client
npm install
npm run dev              # http://localhost:5173
```

End-to-end test (clicking through):

- [ ] Open `http://localhost:5173/` → landing renders, hero says "Reading HackerNews is a part-time job"
- [ ] Open `/demo` → annotated edition loads in <2s (pre-warm is running on boot)
- [ ] Open `/try` → pick role + skill + beats → click Generate → brief streams in
- [ ] Open `/signup` → enter your real email → check inbox for magic link
- [ ] Click the magic link → lands on `/account` with you signed in
- [ ] On `/account` → set send time, click **Send me a test edition** → email arrives
- [ ] In `/account` → click your edition link from the email → renders at `/edition/...`
- [ ] Footer **Unsubscribe** link → confirms → re-check `/account` shows paused
- [ ] Manual cron:
  ```bash
  curl -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost:5180/api/cron/dispatch
  ```
  Returns `{"dispatched": N}`. With your test user, `N` should be 0 if you already got today's edition (idempotent) or 1 if not.

If all 9 pass: ship it. If any fail: fix locally first — deploy debugging is slower.

---

## 5. Render (backend + cron) — 15 min

### 5a. Web Service

1. Go to [render.com](https://render.com) → sign in (GitHub)
2. **New +** → **Web Service** → connect this repo
3. Settings:
   - **Name:** `dispatch-server`
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run migrate`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
4. **Environment** tab → add all the vars from your local `.env`. Critical: `APP_URL` should point at your *Vercel* URL (you'll know it after step 6 — start with a guess like `https://dispatch.vercel.app`, fix later).
5. **Create Web Service** → wait for the first deploy (~3 min)
6. Once live, copy the URL (e.g. `https://dispatch-server.onrender.com`) — you need it for Vercel

**Sanity check:** `curl https://dispatch-server.onrender.com/api/health` → `{"ok":true}`

### 5b. Cron Job

1. Render dashboard → **New +** → **Cron Job**
2. Settings:
   - **Name:** `dispatch-cron`
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Schedule:** `0 * * * *` (top of every hour, UTC)
   - **Command:** `curl -X POST -H "x-cron-secret: $CRON_SECRET" https://dispatch-server.onrender.com/api/cron/dispatch`
   - Set `CRON_SECRET` env var to the same value as the web service
3. Optional second cron — Weekly Review:
   - **Schedule:** `0 9 * * 0` (Sundays 09:00 UTC)
   - **Command:** `curl -X POST -H "x-cron-secret: $CRON_SECRET" https://dispatch-server.onrender.com/api/cron/weekly-review`

---

## 6. Vercel (frontend) — 5 min

1. Go to [vercel.com](https://vercel.com) → sign in (GitHub)
2. **Add New** → **Project** → import this repo
3. Settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build` (default — leave it)
   - **Output Directory:** `dist` (default)
4. **Environment Variables:** add `VITE_API_URL=https://dispatch-server.onrender.com`
5. **Deploy**
6. Once live, copy the URL (e.g. `https://dispatch-app.vercel.app`) — go back to Render and update `APP_URL` env var there

---

## 7. Final smoke test on live URLs — 5 min

Run the same 9 clicks from step 4, but against the live URLs. One additional check:

- [ ] Confirm the email's "View in browser" link works (your Vercel URL)
- [ ] Confirm magic-link emails point at your *Vercel* URL, not localhost

If everything's green: you're shipped.

---

## 8. Post-launch checklist (first 48 hours)

- [ ] Monitor Render logs for unhandled rejections (`grep unhandledRejection`)
- [ ] Watch the OpenAI dashboard — daily cost should be under $1/day for first 10 signups
- [ ] After 24h, hit `/api/admin/cost` (gated by your `ADMIN_EMAILS`) — should match OpenAI dashboard
- [ ] After 48h, check the cron is firing on time — `editions` table should have one row per active user per weekday

---

## Troubleshooting

**"Migration failed: relation already exists"**
The migration runner is idempotent across runs but not partial-run safe. If a migration crashed halfway, the `_migrations` table didn't get the row but the table did get created. Manually `INSERT INTO _migrations (filename) VALUES ('001_init.sql')` and re-run.

**Render web service sleeps after inactivity**
Free tier behavior — first request after sleep takes ~30s. Fine for the cron and OG-image traffic; not great for synchronous SSE. Upgrade to Starter ($7/mo) when you start sending real briefs to real subscribers.

**Magic links go to spam**
Resend default sender (`onboarding@resend.dev`) hits spam ~10% of the time. Resolution: add a custom domain in Resend, update `FROM_EMAIL` to `Dispatch <dispatch@yourdomain.com>`. Takes ~24h for DNS propagation.

**Cost spikes**
Most likely the embedding pre-filter is disabled or `BRIEF_PREFILTER_TOPN` is too high. Default 30 cuts writer cost ~70%. Drop to 20 if cost is still high.

**`/api/sample` returns "Couldn't load today's sample"**
Server boot prewarm hasn't finished. Either wait (~30s after boot) or the OpenAI key is missing/invalid. Check Render logs.
