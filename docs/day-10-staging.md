# Day 10 — Staging deploy dry-run

The first time Dispatch sees real infrastructure. Goal: identify everything that breaks under prod-shaped conditions BEFORE the actual launch deploy. This is a user-executed checklist; the code is ready.

**Time:** ~90 min if you've never deployed to Render/Neon, ~45 min if you have.
**Cost:** $0 — all free tiers.

---

## 0. Why staging exists

Two reasons we're not just deploying to prod directly:

1. **Cold starts + connection pools + DNS** all behave differently in prod than locally. Render's free tier sleeps after 15 min of inactivity; first request after sleep is ~30s. Neon's free tier limits connections. These are real-world behaviors you'll only see under prod conditions.
2. **You want to break it once, in private, on data that doesn't matter.** A staging instance lets you discover "the cron crashes when there are 50 due users in the same hour" without 50 real subscribers seeing it.

After staging is green, prod is mostly a copy-paste with different secrets.

---

## 1. Create the staging services (30 min)

### a. Neon — staging DB

1. [neon.tech](https://neon.tech) → **New Project** → name `dispatch-staging`
2. Copy the pooled `DATABASE_URL` (ends in `-pooler...`)
3. Run migrations:
   ```bash
   cd "/Users/pauti/demo use/dispatch/server"
   DATABASE_URL="postgres://..." npm run migrate
   ```
   Expected: 18 migrations applied (`001_init.sql` through `018_cascade_audit.sql`).

### b. Resend — same account is fine

You can use your existing Resend account; just note that messages from staging count against your monthly quota. Optional: use a different `FROM_EMAIL` for staging (e.g. `Dispatch [STAGING] <staging@yourdomain.com>`) so you can tell them apart in your inbox.

### c. Sentry — staging environment

1. [sentry.io](https://sentry.io) → new project → name `dispatch`
2. Copy:
   - **Node DSN** → `SENTRY_DSN` (server)
   - **React DSN** → `VITE_SENTRY_DSN` (client)
3. Sentry will tag events automatically with the `NODE_ENV` value you set in Render — so set `NODE_ENV=staging` on the Render web service.

### d. PostHog — staging project

1. [posthog.com](https://posthog.com) → free Cloud project → name `dispatch`
2. Two project keys:
   - **Project API key** → `VITE_POSTHOG_KEY` (client) AND `POSTHOG_API_KEY` (server)
3. Set up a "staging" feature flag if you want to gate features later — not required for Day 10.

### e. Render — staging web service + crons

Easiest path: use the `render.yaml` blueprint.

1. [render.com](https://render.com) → **New +** → **Blueprint** → connect repo
2. Pick the branch you want to deploy from (`main` for now)
3. Render reads `render.yaml` and provisions: 1 web service + 2 cron jobs
4. After provisioning, set the secret env vars (Render asks for each marked `sync: false`):
   - `DATABASE_URL` (Neon staging URL from step 1a)
   - `OPENAI_API_KEY`
   - `RESEND_API_KEY`
   - `JWT_SECRET` → `$(openssl rand -hex 32)`
   - `CRON_SECRET` → `$(openssl rand -hex 32)`
   - `ADMIN_EMAILS` → your email
   - `APP_URL` → leave blank for now; we'll fill in after Vercel
   - `SENTRY_DSN`
   - `POSTHOG_API_KEY`
   - `RENDER_DISPATCH_URL` → the Render web service URL (e.g. `https://dispatch-staging-server.onrender.com`)
   - `COST_ALERT_THRESHOLD_USD` → `2.00` for staging (lower so we can test the alert)
   - `COST_ALERT_WEBHOOK_URL` → your Slack incoming webhook (optional)

5. Wait for first build (~3 min). Then:
   ```bash
   curl https://dispatch-staging-server.onrender.com/api/health
   # should return {"ok": true}
   ```

### f. Vercel — staging frontend

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import repo
2. **Framework Preset:** Vite, **Root Directory:** `client`
3. Environment variables:
   - `VITE_API_URL` = staging server URL (e.g. `https://dispatch-staging-server.onrender.com`)
   - `VITE_SENTRY_DSN` = the React DSN
   - `VITE_POSTHOG_KEY` = the PostHog project key
4. Deploy
5. After deploy, copy the Vercel URL → go back to Render env vars → set `APP_URL` to it → trigger redeploy

---

## 2. Smoke test the live URLs (30 min)

Run through `docs/deploy.md` § 4 against the live URLs:

- [ ] `/api/health` returns `{"ok": true}`
- [ ] Home page loads in <2s (cold), <500ms (warm)
- [ ] `/demo` loads with prewarmed brief in <1s after first request
- [ ] `/try` → role + skill + beats → brief streams in
- [ ] `/signup` with your real email → magic link arrives at your inbox
- [ ] Magic link clicked → lands on `/account` signed in
- [ ] **Welcome email arrives** (Wave N Day 5 — check this works on first verify)
- [ ] `/account` → **Send me a test edition** → arrives in inbox
- [ ] Email subject shows the dynamic subject line, not "no subject"
- [ ] Email renders properly in Gmail web + iPhone Mail (open both)
- [ ] **The Editor's Take** block appears between editor's note and the editor's pick
- [ ] Click "View in browser" → loads the edition page
- [ ] Open `/edition/<slug>` → audio player visible at top → play works
- [ ] Bookmark a story → appears on `/saved`
- [ ] Footer "Unsubscribe" → confirmation page → next cron skips you (verify in Render logs)

---

## 3. Cron load test (20 min)

The thing you can't test locally: many users due in the same hour.

```bash
# SSH-equivalent via Render shell or run from your laptop with staging DATABASE_URL:
cd "/Users/pauti/demo use/dispatch/server"

# Use this script to spin up 20 synthetic users all due in the next hour
DATABASE_URL="postgres://staging..." node << 'EOF'
import { sql, findOrCreateUserByEmail, upsertPrefs } from "./db.js";
const NOW = new Date();
const HOUR = String(NOW.getUTCHours()).padStart(2, "0");
for (let i = 0; i < 20; i++) {
  const email = `loadtest-${i}@dispatch.test`;
  const u = await findOrCreateUserByEmail(email);
  await upsertPrefs(u.id, {
    topics: ["Backend Development", "DevOps & Infra", "Developer Tools"],
    depth: "standard",
  });
  // Set their send_time to the next UTC hour, timezone UTC, every day
  await sql`update users set send_time = ${HOUR + ":00:00"}::time, timezone = 'UTC', send_days = ARRAY['mon','tue','wed','thu','fri'], status = 'active' where id = ${u.id}`;
}
console.log("Seeded 20 loadtest users due this UTC hour");
process.exit(0);
EOF

# Then trigger the cron manually
curl -X POST -H "x-cron-secret: $CRON_SECRET" \
  https://dispatch-staging-server.onrender.com/api/cron/dispatch
```

**What to watch:**
- [ ] Render log shows "20 user(s) due — fetching source pool once"
- [ ] All 20 generate without OpenAI timeout
- [ ] Each user gets exactly one edition row (no duplicates on retry — check `editions` table)
- [ ] Neon connection-pool count stays under the free-tier limit (typically 20)
- [ ] PostHog shows 20 `brief_generated` events
- [ ] Sentry has 0 errors (or 0 new errors)
- [ ] OpenAI cost for the run is roughly 20 × $0.007 = $0.14 (verify in `usage_log`)
- [ ] Cron run completes in <5 min (free tier has a 10-min cron timeout)

If any step times out or pool-exhausts: that's the prod ceiling you'll hit at this scale. Mitigations: bump Render tier, or batch the cron run into chunks of 10 with a small delay between.

**Clean up after:**
```sql
delete from users where email like 'loadtest-%@dispatch.test';
-- Verify cascades cleaned everything
select count(*) from editions where user_id not in (select id from users);
```

---

## 4. Things to specifically verify in staging logs

Go to Render dashboard → web service → Logs. Search for:

- [ ] `sentry: initialized` (server boot)
- [ ] `posthog: initialized` (server boot)
- [ ] `prewarm: default sample ready` (within 30s of boot)
- [ ] `cron: N user(s) due — fetching source pool once` (every hour)
- [ ] No `unhandledRejection` or `uncaughtException` lines
- [ ] No `failed for user` errors (or trace them down if present)

In Sentry:
- [ ] At least one test event (deliberately trigger via `curl https://dispatch-staging-server.onrender.com/api/intentional-404` → 404 should NOT fire Sentry; but try fetching a malformed edition slug to trigger something)

In PostHog:
- [ ] `signup_requested` events when you sign up
- [ ] `signup_verified` event when you click magic link
- [ ] `welcome_email_sent` after first verify
- [ ] `brief_generated` events when cron runs
- [ ] `cron_run` event after each hourly run

---

## 5. Sign-off

When everything above is green, you're cleared for prod deploy. If anything failed:

- **Cron timeouts:** investigate OpenAI rate limits, consider chunking
- **Sentry empty:** verify SENTRY_DSN env var is set on both client and server
- **PostHog empty:** verify VITE_POSTHOG_KEY is set on client + POSTHOG_API_KEY on server
- **Cold starts >30s:** that's Render free tier; upgrade to Starter ($7/mo) for prod
- **Welcome email missing:** verify it sent in Resend dashboard; check Sentry for `sendWelcomeEmail` errors
- **Email in spam:** complete the `docs/email-domain.md` DKIM/SPF/DMARC setup before prod

When 4/5 issues from the above remain unresolved after Day 10, Days 11-13 are buffer to fix them.

---

## 6. Tear-down (optional)

Staging can stay live forever — free tiers cover it. Or, if you want a clean break before prod:

- Delete the Vercel project
- Delete the Render services
- Drop the Neon staging branch
- The Sentry and PostHog projects can stay; just create a new "production" environment in each

Most founders keep staging around. It's useful for testing changes safely before pushing to prod subscribers.
