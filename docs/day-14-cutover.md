# Day 14 — Cutover rehearsal (final sign-off before launch)

The last step before going live. Re-run the staging smoke test with prod-shaped data volume, then sign off the launch checklist. If something fails, fix it and re-run; don't deploy with an unchecked box.

---

## 1. Re-seed staging with realistic data (10 min)

```bash
cd "/Users/pauti/demo use/dispatch/server"

# 50 synthetic users with realistic role + beats distribution
DATABASE_URL="postgres://staging..." node << 'EOF'
import { sql, findOrCreateUserByEmail, upsertPrefs } from "./db.js";

const ROLES = ["software_engineer", "ml_engineer", "data_engineer", "security_pro", "devops_sre", "engineering_manager", "ml_learner"];
const SKILLS = ["beginner", "intermediate", "advanced"];
const BEAT_SETS = [
  ["Backend Development", "DevOps & Infra", "Developer Tools"],
  ["ML Engineering", "LLM Applications", "AI Research"],
  ["Data Engineering", "Backend Development", "DevOps & Infra"],
  ["Cybersecurity", "Backend Development", "DevOps & Infra"],
  ["Frontend Development", "Developer Tools", "Open Source"],
];

const NOW = new Date();
for (let i = 0; i < 50; i++) {
  const email = `cutover-${i}@dispatch.test`;
  const u = await findOrCreateUserByEmail(email);
  await upsertPrefs(u.id, {
    topics: BEAT_SETS[i % BEAT_SETS.length],
    depth: i % 3 === 0 ? "deep" : "standard",
  });
  // Spread the send-time across the next 4 UTC hours
  const sendHour = (NOW.getUTCHours() + (i % 4)) % 24;
  const sendTime = `${String(sendHour).padStart(2, "0")}:00:00`;
  const role = ROLES[i % ROLES.length];
  const skill = SKILLS[i % SKILLS.length];
  await sql`
    update users
       set send_time = ${sendTime}::time,
           timezone = 'UTC',
           send_days = ARRAY['mon','tue','wed','thu','fri'],
           status = 'active',
           role = ${role},
           skill_level = ${skill}
     where id = ${u.id}
  `;
}
console.log("Seeded 50 cutover users across 7 roles + 5 beat sets");
process.exit(0);
EOF
```

---

## 2. Force a cron run (5 min)

```bash
curl -X POST -H "x-cron-secret: $CRON_SECRET" \
  https://dispatch-staging-server.onrender.com/api/cron/dispatch
```

Expected response: `{ "dispatched": N, "total": N }` where N is roughly the count of users with `send_time` matching the current UTC hour (~12-13 users per hour given the spread).

Watch the Render logs in real-time. Run this a few times across different UTC hours to cover all 50 users.

---

## 3. Cutover sign-off checklist

### Code quality
- [ ] `npm run build` (client) finishes without errors
- [ ] `node --check` on every changed server file (`server.js`, `cron.js`, `brief.js`, `email.js`, `auth.js`, `db.js`, `routes/auth.js`, `routes/me.js`, `observability.js`, `openai-utils.js`, `usage.js`, `quality.js`, `embeddings.js`, `tts.js`, `slack.js`, `routes/slack.js`)
- [ ] `git status` shows expected files; no accidental commits of `.env`, secrets, or build artifacts
- [ ] `git log --oneline -20` reads like a coherent story; no "wip" or "fix typo" sequences

### Observability is wired
- [ ] Sentry server captures a deliberate test error (e.g. throw inside an admin endpoint)
- [ ] Sentry client captures a deliberate test error (open browser DevTools, run `throw new Error('test')` in console — should show up in Sentry)
- [ ] PostHog has all the expected events: `demo_viewed`, `signup_requested`, `signup_verified`, `welcome_email_sent`, `brief_generated`, `cron_run`
- [ ] Cost alert webhook fires when threshold is set to a low value ($0.01) and the cron runs
- [ ] Sentry / PostHog environment tags say `staging` (will be `production` post-cutover)

### Email pipeline
- [ ] Welcome email arrives within 30s of first verify
- [ ] Brief email arrives at the user's local 8am (or whatever they set)
- [ ] Welcome email renders correctly in Gmail web, Apple Mail, iPhone Mail, Outlook web
- [ ] Brief email renders correctly in the same four clients
- [ ] **The Editor's Take** block appears in both the SPA and the email
- [ ] One-click unsubscribe link works (signed token)
- [ ] "View in browser" link works
- [ ] No emails go to spam in any of the four clients

### Cron
- [ ] Runs every hour without errors (check Render logs across at least 4 hourly runs)
- [ ] Idempotent: re-running the same hour does not double-send
- [ ] Paused users (`paused_until > now()`) are skipped (verify by pausing a test user and re-running cron)
- [ ] Failed brief generation for one user doesn't block the rest
- [ ] OpenAI timeout/retry actually fires when injected (you can simulate by editing `openai-utils.js` to throw a TimeoutError; revert after testing)

### Account deletion (Day 9 test)
- [ ] `node scripts/test-account-deletion.js` against staging DB exits 0
- [ ] No orphan rows in any user-bound table
- [ ] `interest_list` rows for the email are cleaned

### Data integrity
- [ ] Migrations 001-018 all show in `_migrations` table
- [ ] No errors in any migration run
- [ ] `usage_log` has rows for every brief, embedding, judge, TTS call
- [ ] `brief_scores` has rows for every generated brief
- [ ] `attribution_source` is populated for users who signed up with UTM params

### User-facing
- [ ] `/` landing loads in <2s after cold start (or <500ms warm)
- [ ] `/demo` annotated edition loads in <1s (pre-warm hit)
- [ ] `/try` brief stream starts streaming in <2s
- [ ] All routes mentioned in README work
- [ ] Footer links match the navigation surgery from Wave M.4 (no Discover / Streak / Referrals promo)
- [ ] Manifesto and About pages render their full content
- [ ] `/say-hi` and `/early` work
- [ ] `/changelog` shows the right entries

### Half-built surfaces (Day 8 verification)
- [ ] Mobile (iOS Sim) signed off OR explicitly deferred in changelog
- [ ] Slack (test workspace) signed off OR explicitly deferred
- [ ] Audio (TTS) signed off OR explicitly deferred
- [ ] Browser extension (Chrome unpacked) signed off OR explicitly deferred

### Voice
- [ ] At least 5 real briefs read end-to-end during Days 11-13 buffer
- [ ] Prompt has been touched at least 3 times based on failure modes spotted
- [ ] The Take landed appropriately in 80%+ of test briefs (not vague, not "skipped" too often)
- [ ] No banned phrases appeared in any test brief (grep `usage_log` or read briefs directly)

### Domain + deliverability (when applicable)
- [ ] Custom domain DKIM/SPF/DMARC verified (mail-tester.com score ≥ 8.5/10)
- [ ] `FROM_EMAIL` updated to custom domain
- [ ] Old `onboarding@resend.dev` is no longer in use

---

## 4. Final tear-down of cutover test data

```sql
-- Run against staging DB
delete from users where email like 'cutover-%@dispatch.test';
delete from users where email like 'loadtest-%@dispatch.test';

-- Verify no orphans
select 'editions' as t, count(*) from editions where user_id not in (select id from users)
union all
select 'bookmarks', count(*) from bookmarks where user_id not in (select id from users);
-- All counts should be 0
```

---

## 5. Decision point: deploy to prod or buffer more

If every checkbox above is ticked: **deploy to prod tomorrow.** Use the same Render Blueprint + Vercel project, but with fresh secrets (new `JWT_SECRET`, new `CRON_SECRET`, prod Neon DB, prod `FROM_EMAIL`, prod `APP_URL`).

If 2+ checkboxes failed and aren't trivial fixes: **don't deploy.** Stay on staging another week. Better a delayed launch than a broken first-impression.

If 0-1 boxes failed and they're trivial: **fix and re-run cutover.** Don't deploy with known issues; subscribers notice.

---

## 6. Post-launch: 48-hour monitoring

After prod is live and you've open signups:

- Watch Sentry for the first 24h. Any new error class? Investigate immediately.
- Watch PostHog conversion funnel: visitor → signup → verify → first-brief-opened.
- Watch Resend dashboard: bounce rate, complaint rate.
- Watch OpenAI dashboard: daily cost vs. forecast.
- Reply to every email subscribers send (the founder reads every reply promise).
- Read every brief that goes out. Catch voice drift early.

The first 48 hours determine whether subscribers stick. Make them count.
