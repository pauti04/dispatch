# Dispatch

> The morning paper for working developers — written by an editor that actually read this week's wires.

An AI-curated daily five-minute brief for working developers. Each weekday morning at the reader's local 8 a.m., an editor (a language model) reads HackerNews, GitHub Trending, Lobsters, Reddit, arXiv, Show HN, and the month's hiring + layoff signal — then writes a tight, editorially-voiced brief tuned to the reader's role.

![Landing page](screenshots/01-landing.png)

---

## Quick links

- **🎬 [/showcase](http://localhost:5173/showcase)** — a portfolio walk-through (built into the app)
- **📄 [/demo](http://localhost:5173/demo)** — an annotated real brief, no signup
- **📚 [/manifesto](http://localhost:5173/manifesto)** — six things Dispatch believes
- **📰 [/press](http://localhost:5173/press)** — press kit + assets
- **📝 [Project plan](https://github.com/)** — 14 waves of work documented end-to-end

---

## What it is

Dispatch is a solo-built end-to-end product. The newspaper-as-software wedge:

- **Editorial brand**, not a SaaS dashboard. Print typography (DM Serif Display + Crimson Pro), ink/cream/gold, double-ruled mastheads, "Vol. I · No. xxxx" issue numbering. The product looks like a newspaper because it *is* a newspaper.
- **Career-grounded curation**, not entertainment-grounded. Every story carries a "why it matters" line tied to the reader's role + the actual hiring signal underneath it (pulled from monthly HN "Who is hiring" + Layoffs.fyi).
- **Voice over volume.** The brief picks five things and ignores four hundred. The Editor's Take field forces the model to commit to a position. 25+ explicit BAD/GOOD voice examples in the prompt — the voice gets sharper every week as real failure modes get cataloged.

## The annotated demo

![Annotated demo](screenshots/03-demo-annotated.png)

`/demo` is the canonical front door. A real Dispatch edition rendered with editorial callouts that teach the reader the craft of the page as they scroll — Lede, Editor's Note, Editor's Pick, Pull Quote, Why-it-matters line. Ends with a "what just happened" reveal showing pool-size + generation time + subscribe CTA.

## The brand

![Manifesto](screenshots/06-manifesto.png)

Six tenets (Less, on purpose · Voice over volume · Grounded in your career · No doomscroll · No ads, ever · Read every reply). The opposite of every "transformative AI news platform" pitch.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React 18 + Tailwind + react-router-dom |
| Backend | Express on Node |
| Database | Neon (Postgres serverless) |
| Auth | Magic-link email + signed HTTP-only JWT cookie |
| Email | Resend (table-based HTML, inline styles, plain-text fallback, custom-domain DKIM/SPF/DMARC docs) |
| Cron | Render Cron Job (hourly per-user-timezone delivery) |
| AI | OpenAI — gpt-4o-mini (writer + judge + deep-dive), text-embedding-3-small (pre-filter), gpt-4o-mini-tts (audio) |
| Observability | Sentry (server + client) + PostHog (lazy-loaded, dropped initial bundle 40%) |
| Hosting | Vercel (frontend) + Render (backend + cron) + Neon (DB) |
| Mobile | Expo (React Native) — magic-link auth, brief screen, Expo push |
| Browser | Chrome MV3 new-tab override extension |

## Architecture

```
                          ┌────────────────────────────────────────┐
   visitor ──► / ───────► │ Landing → /demo (annotated edition)    │
                          │   │                                    │
                          │   ▼                                    │
                          │ /try (role + skill + beats)            │
                          │   │  POST /api/brief/stream (SSE)      │
                          │   ▼                                    │
                          │ /signup → /verify → /account           │
                          └────────────────────────────────────────┘

  Server (Render)                                       Cron (Render)
  ┌─────────────────────────┐                     ┌───────────────────┐
  │ Express                 │                     │ runDispatchHour() │
  │  /api/brief, sample,    │ ◄───────────────────┤  every hour       │
  │  auth, me, editions,    │                     │ runWeeklyReview() │
  │  admin, slack, push,    │                     │  Sunday 09:00     │
  │  feed, OG, TTS          │                     └───────────────────┘
  │                         │                     ┌───────────────────┐
  │ generateBrief() →       │ ──────────────────► │ Resend            │
  │  fetchSourcePool        │                     │  daily email +    │
  │  (HN/GH/Lobsters/Reddit │                     │  weekly digest    │
  │   /arXiv/ShowHN/HW/LFY) │                     └───────────────────┘
  │  prefilter (embeddings) │                     ┌───────────────────┐
  │  moderate               │ ──────────────────► │ Neon Postgres     │
  │  GPT writer (variant)   │                     │  19 migrations    │
  │  hydrate                │                     └───────────────────┘
  │  scoreBriefAsync()      │
  └─────────────────────────┘
```

---

## Interesting choices

### Editor voice is the moat, not the features.

The prompt has 25+ explicit BAD/GOOD example pairs for what the editor's voice should and shouldn't sound like. A signature **"The Editor's Take"** field forces the model to commit to a position every brief. Hard to clone in a weekend because it's not feature-shaped — it's accumulated specific-failure-mode tuning.

### Embeddings pre-filter cut OpenAI cost ~70%.

Before the writer call, the source pool (~110 clusters) gets cosine-ranked against the user's beats via `text-embedding-3-small`. Only the top 30 reach the writer model. At 1k users: ~$50/mo vs. ~$200/mo with no pre-filter. Caches beat-embeddings + cluster-title-embeddings in-memory LRU.

### Cross-source deduplication, not a feed of feeds.

The same story often shows up on HN, GitHub Trending, Lobsters, and Reddit. URL canonicalization clusters them into one card with stacked source tags. The brief never repeats a story.

### LLM-as-judge for drift detection.

Every brief gets a second pass through gpt-4o-mini that scores it 1–5 on coherence, career-relevance, and voice-fidelity. Scores join with a `prompt_variants` registry for A/B testing the prompt itself — winning variants get promoted to default after 100+ scored briefs.

### Streaming SSE generation, not a 10-second wait.

`/api/brief/stream` is a Server-Sent Events endpoint. The client `EventSource` parser consumes deltas and renders them live in an editorial "Live · composing" pane. From hitting submit to seeing the first headline is ~800ms vs. ~8s for the non-streaming variant.

### Magic-link auth without a sessions table.

Signed JWT in an HTTP-only cookie. No passwords. No sessions table. No password reset flow. Three endpoints: `/auth/request`, `/auth/verify`, `/auth/logout`.

---

## What was built — by the numbers

| Metric | Count |
|---|---|
| Waves shipped | 14 (A–N + Wave M strategic) |
| DB migrations | 19 |
| Frontend routes | 30+ (24 SPA + 6 SSR'd for crawlers) |
| Backend endpoints | 40+ |
| Content sources | 8 (HN, GitHub Trending, Lobsters, Reddit, arXiv, Show HN, Who's Hiring, Layoffs.fyi) |
| LLM models in play | 6 (writer, judge, embed, TTS, deep-dive, variant A/B) |
| Ship surfaces | 3 (web SPA + Expo mobile + Chrome MV3 extension) |
| Cost at 100 users | ~$15/mo (OpenAI + free tiers) |

---

## Local development

```bash
# Backend
cd server
cp .env.example .env   # fill in DATABASE_URL, RESEND_API_KEY, OPENAI_API_KEY, JWT_SECRET, CRON_SECRET
npm install
npm run migrate
npm run dev

# Frontend (new terminal)
cd client
npm install
npm run dev
```

Visit `http://localhost:5173/`. Dev tip: with `RESEND_API_KEY` unset, `/api/auth/request` returns the magic link directly in the JSON response.

## Documentation

- `docs/deploy.md` — step-by-step deploy playbook (Neon + Resend + Render + Vercel)
- `docs/day-8-verification.md` — half-built surface verification checklist
- `docs/day-10-staging.md` — staging deploy runbook + cron load test
- `docs/day-14-cutover.md` — sign-off checklist before prod
- `docs/email-domain.md` — custom-domain DKIM/SPF/DMARC walkthrough
- `docs/voice-scoring.md` — the daily editor-voice habit
- `docs/show-hn-launch.md` — pre-written Show HN post + likely-comment replies
- `docs/co-mention-targets.md` — newsletter outreach list

## The project history

Built in 14 waves. Short version (full details in `~/.claude/plans/splendid-wandering-finch.md`):

| Wave | Theme | Highlight |
|---|---|---|
| A | Content quality | 6 sources + cross-source dedup + hype tags + community takes |
| B | UX polish | Streaming SSE generation, PWA, mobile pass |
| C | Depth + retention | Archive, bookmarks, Sunday Week-in-Review, callbacks |
| D | Distribution | OG images, RSS, invites, share landing |
| E | Personal depth | Audio editions, custom topics, beat weights, vacation mode, skills-trending |
| F | Editorial depth | Featured comment from HN, editor's-pick deep-dive, weekly Quoted, Letters |
| G | Adaptive learning | Click tracking, per-user relevance refinement, send-time optimization |
| H | Growth + virality | Beat SEO pages, story OG, referral leaderboard, browser extension |
| I | Platform reach | Cross-pub teasers, team share links, Dispatch Reports, Expo mobile scaffold |
| J | Quality + cost | Embeddings pre-filter, LLM-as-judge, A/B variants, cost dashboard, moderation |
| K | New growth surfaces | Public bookmark profiles, full-text search, Discover feed, Slack OAuth, push |
| L | Polish | Real Privacy/Terms, mobile nav drawer, reading progress, keyboard shortcuts, microcopy |
| M | startup polish | Annotated /demo, per-role prewarm, manifesto, press kit, founder narrative, nav surgery |
| N | Production hardening | Sentry + PostHog + UTM, cost alerts, OpenAI timeouts, welcome email, The Editor's Take, account-deletion E2E test |
| N+ | Polish + features | Lazy-load PostHog (40% bundle drop), sitemap+robots, admin dashboard, founder note, per-beat RSS, Bluesky+Mastodon share |

---

## Screenshots

### Role-first onboarding

![Onboarding](screenshots/05-try-onboarding.png)

### The anatomy section

![Anatomy](screenshots/02-landing-anatomy.png)

### Press kit

![Press kit](screenshots/07-press-kit.png)

### Public changelog

![Changelog](screenshots/08-changelog.png)

### Mobile

<table>
  <tr>
    <td width="50%"><img src="screenshots/09-landing-mobile.png" alt="Mobile landing" /></td>
    <td width="50%"><img src="screenshots/10-demo-mobile.png" alt="Mobile demo" /></td>
  </tr>
</table>

---

## License

Source-available. Use the code; don't ship a competing daily-tech-brief product with it. Email the editor if you want to do something interesting with it.
