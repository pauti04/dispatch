# Resume-ready content for Dispatch

Pre-written, copy-pasteable, no editing required. Pick the format you need.

---

## One-liner (for "Projects" headers, GitHub bio, Twitter pinned)

```
Dispatch — AI-curated daily morning brief for working developers. Editorial voice, career-grounded curation, six-source aggregation. Solo-built end-to-end.
```

(168 chars — fits Twitter; fits "Featured Project" headers)

---

## Resume bullet (3-5 lines, for the "Projects" section)

```
Dispatch — an AI-curated daily morning brief for working developers.
Live demo: <YOUR_DEPLOYED_URL>/showcase  ·  Source: github.com/<you>/dispatch

• Solo-built end-to-end: Vite + React + Tailwind frontend, Express + Postgres + Resend backend, OpenAI gpt-4o-mini writer with embeddings pre-filter (cut LLM cost ~70%), magic-link auth, daily cron delivery, audio editions, Expo mobile + Chrome extension.
• Designed the editor's voice as the moat: 25+ explicit BAD/GOOD prompt examples, LLM-as-judge quality scoring on every brief, A/B prompt-variant framework with statistical sign-off. Editorial brand (DM Serif Display + ink/cream/gold) — looks like a real newspaper.
• 14 build waves, 19 DB migrations, 30+ routes (6 server-side-rendered for SEO), 40+ API endpoints. Streaming Server-Sent Events for brief generation. Cross-source clustering across HN, GitHub, Lobsters, Reddit, arXiv, Show HN, hiring + layoff signals.
```

---

## Resume project entry (longer, ~100 words, for portfolio sites)

```
Dispatch — daily AI-curated morning brief for working developers
Solo project, 2026.

Designed and built an end-to-end editorial product: an AI editor reads HackerNews, GitHub Trending, Lobsters, Reddit, arXiv, Show HN, and the month's hiring + layoff signals every morning, then writes a five-minute brief in plain editorial voice — tuned to the reader's role and beats. The wedge is voice: a 25-example BAD/GOOD prompt with an explicit "Editor's Take" field, LLM-as-judge scoring every brief, and prompt-variant A/B testing. Stack: Vite + React + Tailwind, Express, Neon Postgres, OpenAI gpt-4o-mini with text-embedding-3-small for cost pre-filtering, Resend for delivery, Sentry + PostHog for observability. Ships on three surfaces: web SPA, Expo mobile, and Chrome new-tab extension. 14 build waves documented; 19 migrations; ~$15/mo OpenAI at 100-user scale.
```

---

## Tech-stack one-line summary

```
Vite · React · Tailwind · Express · Postgres (Neon) · Resend · OpenAI (gpt-4o-mini + text-embedding-3-small + gpt-4o-mini-tts) · Sentry · PostHog · Render · Vercel · Expo · Chrome MV3
```

---

## LinkedIn project description (~50 words, sounds less robotic)

```
Built Dispatch — a daily AI-curated morning brief for working developers, end-to-end. The editor reads HN, GitHub, Lobsters, Reddit, arXiv, Show HN, and hiring signals overnight, then writes a five-minute brief tuned to your role. Solo project; learned a lot about prompt engineering as product, cost pre-filtering with embeddings, editorial product design, and that voice is harder to clone than features.
```

---

## What to lead with by audience

**Hiring manager (technical):** "Editor voice as a moat, not features. LLM-as-judge for drift. Embeddings cut cost 70%."

**Hiring manager (non-technical):** "Five-minute AI-curated morning brief for developers, with a real editorial brand. Looks like a newspaper. Solo-built end-to-end."

**Engineering peer:** "Built an end-to-end newsletter product with an editor voice that's enforced by a 25-example prompt + LLM-as-judge feedback loop. Six sources, dedup, A/B prompt testing, streaming SSE generation."

**Product peer:** "Newspaper-as-software for developers. Three-pillar anatomy (Lede, Editor's Pick, Pull Quote). Career-grounded why-it-matters lines on every story tied to actual hiring signals. Free, no ads, no doomscroll."

**Designer peer:** "Print typography on the screen (DM Serif Display + Crimson Pro + gold accents on ink). Real masthead. Issue numbers. Pull quotes as standalone units. Anti-SaaS dashboard."

---

## When asked "why did you build this?"

Two truthful answers — pick whichever lands:

**Short:** "Reading HackerNews every morning was a part-time job. I wanted a five-minute version that actually respected my time. Existing newsletters were either too breathless, too generic, or too long. I wanted an editor."

**Longer:** "I'd been reading HN, GitHub Trending, and a stack of email newsletters every morning, and I noticed two things. First, the signal was real but the interface for getting at it wasn't — most existing newsletters either copy-pasted headlines (no curation) or summarized everything (too long). Second, the why-it-matters context I actually wanted — what's the hiring impact, what skill demand is shifting, what's worth learning — was nowhere. So I built the version I wished existed. The interesting engineering problem turned out to be voice: making the AI editor sound like a person, not a thread."
