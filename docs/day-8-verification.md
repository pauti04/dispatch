# Day 8 — Verifying half-built surfaces

The four surfaces below were scaffolded earlier (Waves I, K). The code audit on Day 8 confirmed they're well-formed; this is the manual checklist to prove they actually work in real environments before Day 10's staging deploy.

Do each section in any order. Skip a section only if you've explicitly decided to defer that surface (e.g. mobile to month 2).

---

## 1. Mobile (Expo iOS Simulator) — 20 min

Requires Xcode + macOS. Skip on other OSes — defer to a friend with a Mac or test on Android via `expo run:android`.

### Setup

```bash
cd "/Users/pauti/demo use/dispatch/mobile"
npm install
# First-time only: install Xcode iOS Simulator via Xcode → Settings → Platforms

# Boot the backend in another terminal first
cd "../server" && node server.js
```

### Run

```bash
cd "/Users/pauti/demo use/dispatch/mobile"
npx expo start --ios
```

This builds for iOS Simulator and opens it. First build takes ~3-5 min.

### Verification checklist

- [ ] App boots without crash, shows the Dispatch masthead + "Sign in or subscribe" screen
- [ ] Enter your email → tap "Send my magic link"
- [ ] In dev mode (no Resend), the response includes `dev_link` — copy it (or watch the backend logs)
- [ ] Open the dev_link in the simulator's browser → it should hand off to the app via deep link
  - If deep linking isn't set up yet: paste the `?token=...` value into the app's "Paste token" field
- [ ] Brief screen renders with the sample data
- [ ] Pull-to-refresh loads a fresh brief
- [ ] Sign out → returns to login screen
- [ ] Push notification permission prompt fires on first sign-in
- [ ] After accepting push, the backend `push_tokens` table has a row for your user

### Known limitations of the current scaffold

- Magic-link deep linking via universal links isn't wired (`app.json` would need `scheme` + `associatedDomains`). For now the app accepts the token via paste. Acceptable for beta; fix before mobile launch.
- No streak / bookmarks / search screens yet. Brief read-only.
- Push notifications work via Expo's push service; will need an EAS project ID before publishing to App Store.

---

## 2. Slack daily poster — 30 min

Requires a real Slack workspace where you have admin permission to install apps.

### Setup the Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → "From scratch"
2. Name: `Dispatch` (or `Dispatch Dev` for the test instance), pick your test workspace
3. **OAuth & Permissions** → **Scopes** → Bot Token Scopes:
   - `chat:write`
   - `channels:read`
4. **Redirect URLs** → add `http://localhost:5180/api/slack/callback` (for local) and `https://YOUR_RENDER_URL/api/slack/callback` (for prod)
5. Copy:
   - **Client ID** → `SLACK_CLIENT_ID`
   - **Client Secret** → `SLACK_CLIENT_SECRET`
   - Set `SLACK_REDIRECT_URI=http://localhost:5180/api/slack/callback`

Restart the server so it picks up the new env vars.

### Connect a workspace

```bash
# Sign in to Dispatch first (so you have a userId)
# Then visit:
open "http://localhost:5180/api/slack/connect"
```

This redirects through Slack's OAuth. After approving, you land back on `/account?slack=connected`.

### Test the daily post

```bash
# Get your most recent edition slug from the DB (or use the test-send endpoint to create one)
EDITION_SLUG="..."

# Trigger a test post (must be authenticated via the cookie set by signing in)
curl -X POST -b cookies.txt \
  "http://localhost:5180/api/slack/test/$EDITION_SLUG"
```

### Verification checklist

- [ ] OAuth dance completes without error
- [ ] `slack_integrations` table has a row for your user + workspace + channel
- [ ] Test post lands in the chosen channel
- [ ] Message has: header, headline, editor's note (italic), The Editor's Take (bold block), editor's pick with star, section dividers, story links, "View full edition" footer
- [ ] All story links work
- [ ] "View full edition" link works (opens Dispatch in browser)
- [ ] Disconnecting via `DELETE /api/slack/integrations/:id` sets status to "revoked"; next cron skips this user's Slack

### Cron path (live test, optional)

Once everything above passes, trigger a real cron run with at least one user who has Slack connected:

```bash
curl -X POST -H "x-cron-secret: $CRON_SECRET" \
  http://localhost:5180/api/cron/dispatch
```

Verify the brief lands in the connected Slack channel.

---

## 3. Audio editions — 10 min

Already shipped (TTS pipeline + endpoint + UI). This is a sanity-check listen.

### Verification checklist

- [ ] Sign in to Dispatch
- [ ] Open any edition page (must be one of your own editions — audio is auth-gated)
- [ ] Scroll to "Audio edition · narrated" near the top of the brief
- [ ] Tap play
- [ ] Voice sounds natural (default voice "alloy" — change via `OPENAI_TTS_VOICE` env if you prefer another)
- [ ] Audio includes: headline, editor's note, editor's pick, the most important story per beat
- [ ] Length is roughly proportional to brief length (~3-5 min for a standard-depth brief)
- [ ] MP3 caches for 24h server-side — second listen should be near-instant

If audio fails:
- Check Render logs for "audio error"
- Verify `OPENAI_API_KEY` has TTS access enabled in your OpenAI org
- Verify `OPENAI_TTS_MODEL=gpt-4o-mini-tts` is set (or accept default)

### Cost note

TTS is the most expensive per-brief operation (~$0.015 per 1000 chars; a brief averages ~2500 chars ≈ $0.04). At 100 daily-listener subscribers that's ~$120/mo. Free tier subscribers shouldn't get auto-generated audio — gate behind a flag once paid tier launches.

---

## 4. Browser extension — 10 min

The new-tab override extension. Loads today's sample brief into every new tab.

### Load unpacked into Chrome

1. Open Chrome → `chrome://extensions/`
2. Toggle **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select `/Users/pauti/demo use/dispatch/extension`
5. The extension appears in the list as "Dispatch · Tech — new tab"

### Verification checklist

- [ ] Open a new tab → shows the Dispatch masthead, today's lede, editor's note
- [ ] If The Take is in today's sample → it renders
- [ ] Editor's pick story appears with star marker
- [ ] Section dividers + stories follow
- [ ] Story link clicks work
- [ ] "See your full edition" link at the bottom works (opens Dispatch in another tab)
- [ ] **Settings** button works → can override the API URL (useful when switching between local dev and prod)
- [ ] No console errors in the extension's DevTools

### When you switch to production

The extension reads from whatever `API_URL` is set in its settings (defaults to `http://localhost:5180`). Once you deploy, you'll need to:

1. Open settings in the extension → paste prod URL (e.g. `https://dispatch-server.onrender.com`)
2. (Optional) Update `manifest.json` `host_permissions` to whitelist your prod domain (already includes `*.onrender.com`)
3. (Optional) Publish to Chrome Web Store: $5 one-time, ~2 day review

---

## Sign-off

| Surface | Code reviewed | Manual verified |
|---|---|---|
| Mobile (iOS Sim) | ✓ Day 8 audit | [ ] |
| Slack daily poster | ✓ Day 8 audit (+ Take added) | [ ] |
| Audio editions | ✓ Day 8 audit | [ ] |
| Browser extension | ✓ Day 8 audit (+ tagline updated) | [ ] |

When all four manual columns are checked, Day 8 is complete. If a surface won't be ready in 2 weeks (e.g. Mobile requires App Store review), explicitly defer it in the changelog and remove its promo from the site.
