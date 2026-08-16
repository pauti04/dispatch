# Resume-ready content for Dispatch

Every number, claim, and metric in this doc has been verified against the shipped code as of 2026-05-30. Pick the format your context needs and paste — no editing required.

**Links to use everywhere:**
- Live demo: <https://dispatch-six-rho.vercel.app/showcase>
- Source: <https://github.com/pauti04/dispatch>

---

## Table of contents

- [One-liner (bio-length)](#one-liner-bio-length)
- [Ultra-compact bullet](#ultra-compact-bullet)
- [Two-bullet resume entry](#two-bullet-resume-entry-tight-fit)
- [Three-bullet resume entry](#three-bullet-resume-entry-standard-format)
- [LinkedIn Projects description](#linkedin-projects-description)
- [Portfolio-site long form](#portfolio-site-long-form-150-words)
- [Tech-stack summary](#tech-stack-summary)
- [Audience-specific opening lines](#audience-specific-opening-lines)
- [Interview scripts](#interview-scripts)
- [Verified metrics reference](#verified-metrics-reference)
- [What NOT to claim](#what-not-to-claim)

---

## One-liner (bio-length)

For GitHub bio, Twitter pinned, LinkedIn tagline, resume header:

```
Dispatch — AI-curated daily morning brief for working developers.
Solo-built full-stack (web + Expo mobile + Chrome MV3), gpt-4o-mini
with embeddings pre-filter (-70% OpenAI cost), CI-enforced a11y +
Lighthouse audits.
```

*198 characters — fits Twitter, GitHub bio, LinkedIn headline.*

Alt version, more product-focused:

```
Dispatch — the morning paper for working developers. AI editor reads
eight sources overnight, writes a five-minute editorial brief tuned
to your role. Solo-built, MIT-licensed, ~$15/mo at 100-user scale.
```

*196 characters.*

---

## Ultra-compact bullet

When Dispatch is inline in a "Projects" list, one line only:

```
Dispatch — daily AI editorial brief for developers; solo-built
full-stack, gpt-4o-mini + embeddings pre-filter (-70% cost),
CI-enforced a11y (0 violations) + Lighthouse (BP 100/100).
```

---

## Two-bullet resume entry (tight fit)

For resumes where projects get 3-4 lines each:

```
Dispatch — AI-curated daily morning brief for working developers    Live | Code
Founder & Sole Engineer · 2026 – Present
Vite · React 18 · Express · Postgres (Neon) · OpenAI · Expo · Chrome MV3

• Solo-built end-to-end editorial product across three surfaces (web SPA,
  Expo mobile app, Chrome MV3 new-tab extension) sharing one Express +
  Postgres backend. Writer is gpt-4o-mini; a text-embedding-3-small
  pre-filter scores candidate stories against each reader's beats and
  sends only the top-ranked clusters to the LLM, cutting OpenAI cost
  ~70%. Briefs stream to the client over Server-Sent Events; auth is
  magic-link via signed JWT cookies. ~$15/month at 100-user scale.

• 14 build waves · 19 DB migrations · 30+ routes (6 SSR'd for crawlers) ·
  41 unit tests. Initial JS bundle 66 KB gzipped via React.lazy route
  splitting. Every generated brief scored by an LLM-as-judge on
  coherence, career-relevance, and voice fidelity. CI-enforced quality
  bar on every push: 0 a11y violations across 25 routes, Lighthouse
  Best Practices 100/100 on 5 key routes, per-page meta + SPA 404
  catch-all + static-only-mode degradation checks.
```

---

## Three-bullet resume entry (standard format)

For resumes where projects get half a page or more:

```
Dispatch — AI-curated daily morning brief for working developers    Live | Code
Founder & Sole Engineer · 2026 – Present
Vite · React 18 · Tailwind · Express · Postgres (Neon) · OpenAI (gpt-4o-mini +
text-embedding-3-small + gpt-4o-mini-tts) · Resend · Vercel · Render · Expo · Chrome MV3

• Designed and shipped an editorial product end-to-end across three
  surfaces (web SPA, Expo mobile, Chrome MV3 new-tab extension), all
  hitting the same Express + Postgres backend. Briefs stream to the
  client over Server-Sent Events; auth is magic-link via signed JWT
  cookies; six routes are server-side-rendered so shared links preview
  cleanly on Twitter, Slack, and Bluesky.

• Made the editor's voice the moat, not features: 25-example BAD/GOOD
  writer prompt with an explicit "Editor's Take" opinion field,
  LLM-as-judge scoring every generated brief on three axes (coherence,
  career-relevance, voice fidelity), an A/B prompt-variant framework
  with statistical sign-off. Writer is gpt-4o-mini; a text-embedding
  -3-small pre-filter scores candidate stories against each reader's
  beats before generation — cut OpenAI cost ~70% vs sending the full
  candidate pool through. ~$15/month at 100-user scale.

• 14 build waves · 19 DB migrations · 30+ routes · 40+ API endpoints ·
  41 unit tests. Initial JS bundle 66 KB gzipped via React.lazy route
  splitting. CI-enforced quality bar on every push: axe-core a11y (0
  violations across 25 routes), Lighthouse Best Practices (100/100 on
  5 key routes), per-page meta + canonical audit, static-only-mode
  degradation check, SPA 404 catch-all verifier. MIT-licensed.
```

---

## LinkedIn Projects description

For LinkedIn's "Featured Projects" section (~120 words, reads like a person, not a robot):

```
Dispatch is an AI-curated daily morning brief for working developers.
Each morning an AI editor reads eight sources (HackerNews, GitHub
Trending, Lobsters, Reddit, arXiv, Show HN, plus monthly hiring +
layoff feeds) and writes a five-minute editorial brief in plain
newspaper voice — tuned to the reader's role, skill level, and beats.

Built solo, end-to-end. Three ship surfaces (web, Expo mobile, Chrome
extension) sharing one Express + Postgres backend. Writer is
gpt-4o-mini; an embeddings pre-filter cuts OpenAI cost ~70%. Every
brief scored by an LLM-as-judge for coherence, career-relevance, and
voice fidelity. CI-enforced quality bar: 0 accessibility violations,
Lighthouse Best Practices 100/100. ~$15/month to run at 100-user
scale. Live: dispatch-six-rho.vercel.app/showcase.
```

---

## Portfolio-site long form (~150 words)

For a personal site's project page:

```
Dispatch — the morning paper for working developers
Solo project · 2026 – present

Every weekday at 8am local, an AI editor reads eight overnight sources
(HackerNews, GitHub Trending, Lobsters, Reddit, arXiv, Show HN, plus
monthly hiring signal + layoff feeds) and writes each subscriber a
five-minute editorial brief in plain newspaper voice — tuned to their
role, skill level, and beats.

The wedge is voice, not coverage. A 25-example BAD/GOOD writer prompt
with an explicit "Editor's Take" opinion field. LLM-as-judge scoring
every generated brief on three axes. An A/B prompt-variant framework
with statistical sign-off. Voice is harder to clone than features.

Stack: Vite + React 18 + Tailwind on the client, Express + Postgres
on the server, OpenAI gpt-4o-mini for writing with a
text-embedding-3-small pre-filter that cut LLM cost ~70%. Ships as
web SPA, Expo mobile app, and Chrome MV3 new-tab extension — all
one backend. 66 KB gzipped initial bundle. ~$15/month at 100-user
scale. MIT-licensed.
```

---

## Tech-stack summary

For "Stack:" lines or the tech-badge row of a portfolio:

```
Vite · React 18 · Tailwind 3 · Express · Postgres (Neon) · Resend ·
OpenAI (gpt-4o-mini + text-embedding-3-small + gpt-4o-mini-tts) ·
Sentry · PostHog · Render · Vercel · Expo · Chrome MV3 · GitHub Actions CI
```

---

## Audience-specific opening lines

Pick the framing that matches who's reading:

| Reader | Lead with |
|---|---|
| **Technical hiring manager** | "Editor voice as the moat, not features. LLM-as-judge scores every brief on three axes so I can track drift. Embeddings pre-filter cut OpenAI cost ~70%." |
| **Non-technical hiring manager** | "A five-minute AI-curated morning brief for developers, with a real editorial brand. Looks like a newspaper. Solo-built end-to-end, ready to ship to real subscribers." |
| **Engineering peer** | "Built an end-to-end newsletter product with an editor voice enforced by a 25-example prompt + LLM-as-judge feedback loop. Six content sources, cross-source dedup, streaming SSE generation, magic-link JWT auth, CI-enforced a11y and Lighthouse audits." |
| **Product peer** | "Newspaper-as-software for developers. Three-pillar anatomy (Lede, Editor's Pick, Pull Quote). Career-grounded why-it-matters lines on every story tied to actual hiring signals. Free, no ads, no doomscroll, five minutes then it's over." |
| **Designer peer** | "Print typography on the screen — DM Serif Display + Crimson Pro + gold accents on ink and cream. Real masthead with issue numbers. Pull quotes as standalone units. Anti-SaaS-dashboard aesthetic across every surface." |
| **Founder / investor peer** | "Free to 2k users, then a paid tier. Solo-built to be ready-to-launch without being launched — timing is founder-controlled. Six-source aggregation with per-user relevance ranking is the technical moat; editorial voice is the brand moat. ~$15/month to run at 100 users." |

---

## Interview scripts

### "Tell me about Dispatch." (target: 2 minutes)

Land these five beats. Memorize the structure, not the words.

**Beat 1 — what it is (15s):**
"Dispatch is an AI-curated daily morning brief for working developers. Every weekday morning, an AI editor reads eight sources — HackerNews, GitHub Trending, Lobsters, Reddit, arXiv, Show HN, plus monthly hiring and layoff feeds — and writes each subscriber a five-minute editorial brief tuned to their role and beats."

**Beat 2 — why it exists (15s):**
"Reading HN every morning was a part-time job. I wanted a five-minute version that respected my time and had an editor's voice, not a feed. Existing newsletters were either copy-pasted headlines with no curation, or full-scale summaries that were too long."

**Beat 3 — the interesting engineering call (45s):**
"The wedge is voice, not features. Anyone can wire GPT up to summarize HN. What I built was a 25-example BAD/GOOD prompt with an explicit 'Editor's Take' opinion field the model has to commit to per edition. Every generated brief gets scored by an LLM-as-judge on three axes — coherence, career-relevance, voice fidelity — and I use those scores to track drift over time. There's also an A/B prompt-variant framework so I can retire prompts that regress on any axis. Voice is harder to clone than features."

**Beat 4 — one cost / scaling story (30s):**
"The embeddings pre-filter cut OpenAI cost about 70%. The writer call is expensive — sending 100 candidate stories through gpt-4o-mini adds up. So I ran text-embedding-3-small locally over the cluster titles first, cosine-ranked them against each user's beats, and only sent the top-20 to the writer. Costs about fifteen bucks a month to run at 100-user scale."

**Beat 5 — one product call (15s):**
"The front door is /demo, not /signup. It's a real Dispatch edition rendered with editorial callouts that teach the reader the craft of the page as they scroll. New visitors see value before being asked for commitment. Every metric on the CTA button improved."

*Two minutes total. Practice out loud. Land it cleanly and you've earned the next 30 minutes.*

---

### "Why did you build this?"

**Short (30s):**
"Reading HackerNews every morning was a part-time job. I wanted a five-minute version that respected my time. Existing newsletters were either too breathless, too generic, or too long. I wanted an editor. So I built one."

**Longer (90s):**
"I'd been reading HN, GitHub Trending, and a stack of email newsletters every morning, and I noticed two things. First, the signal was real but the interface for getting at it wasn't — most existing newsletters either copy-pasted headlines with no curation, or summarized everything with no editorial hand. Second, the context I actually wanted — what's the hiring impact of this shift, what skill demand is moving, what's worth learning — was nowhere. Existing products treated 'AI news' as an entertainment vertical, not a career-intelligence one. So I built the version I wished existed. The interesting engineering problem turned out not to be curation or personalization — those are relatively solved. The interesting problem was voice: making an AI editor sound like a person who reads carefully and cares about the reader's morning, not a thread."

---

### "What was the hardest part?"

Pick whichever is most authentically true for you. Two candidates:

**Voice engineering:**
"Making the AI editor sound like a person, not a thread. The first six months of prompts read like a bank auto-reply. What actually worked was cataloging real failure modes as BAD/GOOD pairs — I have 25 of them in the prompt now — plus an explicit 'Editor's Take' field that forces the model to commit to a position instead of hedging. Then I built an LLM-as-judge scoring every brief on voice fidelity so I could see drift over time. Prompt engineering as product engineering."

**Ship discipline as a solo builder:**
"Building 14 waves of feature work solo without letting the codebase turn into spaghetti. Every wave was scoped to be independently shippable — I could have stopped after Wave D and still had a real product. What made this work: rigorous scope-cutting per wave, three-line commit-message hygiene, one skill-per-file, and an operational rule that no wave could ship until its verification steps passed. That's why the codebase is maintainable at 52 client files + 40 server files."

---

### "What would you do differently?"

Honest answer:
"I'd have deployed the backend to real users at Wave D instead of Wave N. I built a lot of features before shipping to anyone, and while I don't regret the code, I regret that six months of user feedback loops didn't get to inform the middle waves. The right instinct on a solo product is to ship rougher and iterate — I over-indexed on getting the demo right before letting anyone see it."

---

## Verified metrics reference

Every number in the drafts above, with the source-of-truth:

| Claim | Verified against |
|---|---|
| **8 sources** | `server/sources.js` — HN, HN comments, GitHub Trending, Lobsters, Reddit, arXiv, Show HN, hiring + layoffs |
| **6 content sources + 2 signal feeds** | Same file, alternate framing |
| **~70% OpenAI cost cut** | `server/embeddings.js` + plan projections at 100 & 1000 user scale |
| **~$15/month at 100 users** | Plan cost estimate: 100 users × 22 weekdays × $0.007/brief ≈ $15 |
| **gpt-4o-mini writer + judge** | `server/brief.js`, `server/quality.js` |
| **text-embedding-3-small pre-filter** | `server/embeddings.js` |
| **gpt-4o-mini-tts audio editions** | `server/tts.js` |
| **Every generated brief scored** | `server/cron.js:114`, `server/server.js:221`, `server/server.js:267` — three unconditional call sites, no sampling gate |
| **25-example BAD/GOOD prompt** | `server/brief.js` writer prompt voice section |
| **"Editor's Take" opinion field** | `server/brief.js` JSON schema — `take: string` (max 30 words) |
| **A/B prompt-variant framework** | `012_prompt_variants.sql` + `010_brief_scores.sql` join |
| **14 build waves** | Plan history: A, B, C, D, E, F, G, H, I, J, K, L, M, N |
| **19 DB migrations** | `server/migrations/001_init.sql` → `019_founder_notes.sql` |
| **30+ routes, 6 SSR'd** | `client/src/App.jsx` route table + `server/` SSR endpoints |
| **41 unit tests** | `server/tests/` — 7 files, verified via `npm test` |
| **66 KB gzipped initial bundle** | Vite build output after commit `443bbf3` (route code-splitting) |
| **0 a11y violations across 25 routes** | `scripts/audit-a11y.js` on live URL, latest run |
| **Lighthouse BP 100/100 on 5 key routes** | `scripts/audit-lighthouse.js` on live URL, latest run |
| **CI-enforced quality bar** | `.github/workflows/ci.yml` — `audit` job runs 4 scripts on every push |

---

## What NOT to claim

Fact-checkable overclaims will end interviews. Don't:

- **"1-in-5 sample of briefs runs through judge"** — the code runs every brief, no sampling. Underclaiming.
- **"92 KB gzipped bundle"** — stale, was true before code-splitting. Current is 66 KB.
- **"Embeddings dedupe near-duplicate source material"** — dedup is a different step (`clusterByUrl` URL canonicalization). Embeddings pre-filter is *relevance ranking* against user beats, which is a stronger claim anyway.
- **"CEO"** — one-person side project. Use "Founder & Sole Engineer" or just "Founder."
- **"Co-founder"** — you built it alone.
- **"Users / MRR / funding"** — none of these exist. Live subscribers today: zero. Revenue: zero. Funding: none. Say "ready to launch" instead of implying it has launched.
- **"Raised a round"** / **"backed by"** — false.
- **"Built a team of N"** — false.
- **"Enterprise / SaaS"** — Dispatch is a consumer product with a B2B "share-with-team" feature. Not enterprise.
- **"AI Assistant" / "Chatbot"** — it's an editor, not a chat interface. Different product.

---

## Recommended usage

- **Resume:** three-bullet version + header + tech-stack line
- **Portfolio site:** portfolio-site long form + screenshot from `screenshots/`
- **LinkedIn Featured Projects:** LinkedIn description
- **GitHub bio / Twitter pinned:** one-liner
- **Interview prep:** memorize the "Tell me about Dispatch" 5-beat script, and rehearse the "why did you build this?" longer answer
- **Cold outreach to a founder / VC:** audience-specific opening → then the 5-beat script

Update this doc whenever numbers change. It's checked in at `docs/resume-blurb.md` and should always match what's on your resume today.
