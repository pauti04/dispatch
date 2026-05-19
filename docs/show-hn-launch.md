# Show HN launch kit — Dispatch · Tech

A pre-written kit for the launch morning. Live in `docs/` (not visible to public).

---

## The post

**Title (80 chars max):**
> Show HN: Dispatch — an AI editor that reads HN, GitHub, arXiv each morning for you

**Body (markdown — paste directly into Show HN form):**

```
Hey HN. I built Dispatch — a daily five-minute morning brief for working developers.

Each morning an AI editor reads HackerNews, GitHub Trending, Lobsters, Reddit, arXiv,
Show HN, and the month's hiring + layoff signal. It then writes you a brief in a
tight editorial voice — tuned to your role and the beats you care about. Every story
carries a "why this matters" line grounded in your career, not generic news framing.

Free. Weekdays. 8 a.m. local. No ads, no upsell.

A real annotated edition is live at: <APP_URL>/demo

The premise: reading HN every morning is a part-time job, and the existing newsletters
are either too breathless, too generic, or so long they join the "read later" pile.
Dispatch picks five things, ignores four hundred, and stands behind the picks.

Built with: Vite + React frontend, Express + Postgres + Resend backend, gpt-4o-mini
with an embeddings-based pre-filter so the pool gets cut before the writer call.

I read every reply. Happy to dig into the prompt, the embeddings pre-filter, the
hype-tag heuristics, the editor voice, or any of it.
```

---

## Top 10 likely comments — pre-written replies

1. **"Why not just use [other AI news app / X]?"**
   > Most existing AI news apps are aggregators with an LLM stapled on. Dispatch is the
   > opposite — a strict five-thing daily, editorial voice, role-tuned why-it-matters
   > lines. I tried the others; they didn't replace my morning HN scroll. This does for me.

2. **"How is this different from TLDR / Refactoring / Bytes?"**
   > Three things: (a) it's a brief written by an editor, not a summary roundup; (b)
   > every story has a career-grounded why-it-matters line specific to your role; (c)
   > it pulls from six sources (HN/GH/Lobsters/Reddit/arXiv/Show HN) plus hiring + layoff
   > signal — not just one or two.

3. **"What's the prompt?"**
   > Source is at `server/brief.js`. Happy to walk through it. Short version: voice rules
   > first (no exclamation marks, no marketing words, no LinkedIn-isms, list ~25 banned
   > phrases), then schema, then a clustered pool with primary refs. The output is JSON.

4. **"Does it actually pick well?"**
   > For me, yes — that's why I built it. There's a quality-scorer running on every brief
   > (LLM-as-judge across coherence / career-relevance / voice fidelity) so I can track
   > drift. A/B prompt testing lives behind that. Try it on /demo and decide for yourself.

5. **"How much does this cost to run?"**
   > About $0.007 per brief at gpt-4o-mini, ~$15/mo for 100 users. With the embeddings
   > pre-filter (text-embedding-3-small + cosine rank locally) we cut pool tokens ~70%
   > before the writer call. Resend is free under 3k emails/mo. Render free tier hosts the
   > web + cron. Neon free tier on the DB.

6. **"Is this an LLM hallucinating stories?"**
   > No — every story in the brief is grounded in a real cluster from the pool. The
   > editor picks from a set of canonical URLs; it doesn't invent titles or sources. The
   > worst it does is occasionally write a why-it-matters line that's too generic, which
   > the quality scorer catches.

7. **"What about the email delivery side?"**
   > Magic-link auth, signed-cookie sessions, no passwords. Daily cron runs hourly and
   > sends to users whose local 8 a.m. is in the current UTC hour. Idempotent per
   > user+date. Sunday gets a separate Week-in-Review.

8. **"Why six sources instead of just HN?"**
   > HN alone has a strong but narrow signal. Lobsters surfaces things HN buries
   > (Smalltalk, OCaml, real-system stuff). arXiv is where the ML papers actually live.
   > Reddit covers stuff HN underweights (web dev specifics). GitHub Trending shows what
   > devs are actually building. Show HN is the launch firehose. Combined, the pool is
   > ~5x more diverse — the editor's job is then to cut, not to find.

9. **"What about privacy?"**
   > Store email, role, beats, delivery prefs, click tracking (for relevance refinement).
   > No tracking pixels in emails, no analytics scripts on the site. Account delete
   > cascades everything. Source is open about it.

10. **"Can I see the source?"**
    > Yes — repo at <REPO_URL>. README walks through the architecture. Especially happy
    > if anyone wants to look at the prompt and tell me where it's weak.

---

## Launch-morning checklist (do in order)

- [ ] Verify the cached sample brief is ≤2h old at submission time
- [ ] Verify /demo loads in <1s from a fresh browser (incognito)
- [ ] Verify /signup → magic link → /account works end-to-end
- [ ] Verify /api/health returns 200
- [ ] Verify /reports, /beats, /story/:slug/:ref crawler routes render valid HTML
- [ ] Submit Show HN post at 8:30 a.m. PT (peak HN morning traffic)
- [ ] Stand by for first 4 hours — reply to every top-10 comment within 15 min
- [ ] Hit refresh on /admin/cost periodically to watch the curve
- [ ] After 24h, write up the launch numbers as the week's changelog entry

---

## Best screenshots to attach (if HN supports inline images via host)

1. `/demo` — the annotated edition, captured mid-scroll showing 3 callouts
2. Email preview — the rendered Dispatch email in Gmail mobile
3. Account page — showing role + skill + beats config
4. Edition page mid-article with bookmark stars + featured-comment block

---

## After the launch

- Pull every comment into a spreadsheet
- Categorize: feature request / criticism / question / endorsement
- For each criticism: decide ship-fix vs. document-as-known-issue
- For each feature request: add to the "post-launch backlog" doc
- For each endorsement: thank in-thread, follow up via DM where possible
- Within 7 days, ship at least ONE thing visible to launch commenters and reply to those
  threads with "shipped: <link>" — closes the loop loudly
