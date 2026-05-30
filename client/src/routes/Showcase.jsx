import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";

/**
 * /showcase — the portfolio-grade page meant for a resume link.
 *
 * Pitched at someone (recruiter, peer, hiring manager) who clicked through
 * from a resume and has zero context. Three things they need fast:
 *   1. What Dispatch is, in one sentence
 *   2. What was built (visual evidence)
 *   3. How it was built (stack + interesting choices)
 *
 * Self-contained. One scroll. Heavy on visuals. Links out to /demo for the
 * "see it actually work" payoff at the bottom.
 */
export default function Showcase() {
  return (
    <>
      <PageMeta
        title="Showcase · about this project"
        description="An AI-curated daily morning brief for working developers — built from scratch as a portfolio piece. Editorial voice, career-grounded curation, single-developer-shipped product."
      />
      <Masthead subscript="A portfolio project · built from scratch" />
      <main id="main" tabIndex={-1} className="max-w-6xl mx-auto px-6 py-12">
        {/* Pitch */}
        <section className="text-center max-w-3xl mx-auto mb-16">
          <p className="eyebrow mb-3">A morning newspaper, redrawn for software</p>
          <h2 className="font-display text-4xl md:text-6xl text-paper leading-[1.05] mb-5">
            Dispatch is an AI-curated daily brief for working developers — written by an editor that actually read the wires.
          </h2>
          <p className="font-serif-body text-paper-dim text-lg leading-relaxed">
            A solo-built end-to-end product: editorial landing, role-first onboarding, streaming brief generation,
            magic-link auth, daily cron delivery, audio editions, mobile + extension, and a real publication's
            voice — held together by an AI editor that picks five things and ignores four hundred.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap mt-8">
            <Link to="/demo" className="btn-primary">See the live demo →</Link>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              View source on GitHub
            </a>
          </div>
        </section>

        <hr className="rule-gold mb-16" />

        {/* By the numbers */}
        <section className="mb-20">
          <p className="eyebrow text-center mb-3">By the numbers</p>
          <h3 className="font-display text-3xl md:text-4xl text-paper text-center leading-tight mb-10">
            What was built.
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <Stat n="14" label="waves shipped" sub="A–N + Wave M strategic" />
            <Stat n="19" label="DB migrations" sub="Postgres on Neon" />
            <Stat n="30+" label="frontend routes" sub="Vite + React + Tailwind" />
            <Stat n="40+" label="backend endpoints" sub="Express + JWT cookies" />
            <Stat n="8" label="content sources" sub="HN, GitHub, Lobsters, Reddit, arXiv, Show HN, hiring, layoffs" />
            <Stat n="6" label="LLM models in play" sub="Writer, judge, embed, TTS, deep-dive, variant A/B" />
            <Stat n="3" label="ship surfaces" sub="Web, mobile (Expo), browser extension" />
            <Stat n="$15/mo" label="cost at 100 users" sub="OpenAI + free tiers" />
          </div>
        </section>

        <hr className="rule-gold mb-16" />

        {/* Visual tour */}
        <section className="mb-20">
          <p className="eyebrow text-center mb-3">A visual tour</p>
          <h3 className="font-display text-3xl md:text-4xl text-paper text-center leading-tight mb-10">
            The product, in eight screenshots.
          </h3>

          <Shot
            src="/screenshots/01-landing.png"
            caption="Landing — editorial brand: ink + cream + gold, DM Serif Display masthead, opinionated hero (Reading HackerNews is a part-time job. Outsource it.) over a five-source AI editor pitch."
          />
          <Shot
            src="/screenshots/03-demo-annotated.png"
            caption="The annotated /demo — a real Dispatch edition wrapped in editorial callouts that teach the reader the craft of the page as they scroll. New visitors see VALUE before being asked for commitment."
          />
          <Shot
            src="/screenshots/05-try-onboarding.png"
            caption="Role-first onboarding — pick your role + skill level + beats in under a minute. The brief generation then streams live via Server-Sent Events from the OpenAI completion."
          />
          <Shot
            src="/screenshots/02-landing-anatomy.png"
            caption="Three-pillar anatomy — Lede, Editor's Pick, Pull Quote. The whole brand commits to less. Wave M cut this from 6 cards to 3 because more was diluting the wedge."
          />
          <Shot
            src="/screenshots/06-manifesto.png"
            caption="/manifesto — six things Dispatch believes, one paragraph each, read in 90 seconds. Voice over volume. Less, on purpose. No doomscroll."
          />
          <Shot
            src="/screenshots/07-press-kit.png"
            caption="/press — a real press kit. One-liner, short pitch, key facts, founder bio, brand notes, assets. So when someone writes about Dispatch they have everything in one page."
          />
          <Shot
            src="/screenshots/08-changelog.png"
            caption="/changelog — a public week-by-week record of what shipped. Builds trust with early subscribers. Signals momentum to anyone watching."
          />

          <div className="grid md:grid-cols-2 gap-8 mt-10">
            <Shot
              src="/screenshots/09-landing-mobile.png"
              caption="Mobile responsive — the masthead and hero translate down without losing the editorial feel."
              compact
            />
            <Shot
              src="/screenshots/10-demo-mobile.png"
              caption="Annotated demo on mobile — sticky CTA stays visible, callouts stack cleanly."
              compact
            />
          </div>
        </section>

        <hr className="rule-gold mb-16" />

        {/* Tech */}
        <section className="mb-20">
          <p className="eyebrow text-center mb-3">Under the hood</p>
          <h3 className="font-display text-3xl md:text-4xl text-paper text-center leading-tight mb-10">
            How it's built.
          </h3>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl mx-auto">
            <TechBlock title="Frontend">
              Vite + React 18 + Tailwind. React Router for 30+ routes including 6 server-side
              rendered (SEO + crawler-friendly). Inter / Crimson Pro / DM Serif Display.
              PWA with maskable icon. Service worker for offline shell. Streaming brief
              consumption via SSE EventSource parser.
            </TechBlock>
            <TechBlock title="Backend">
              Express on Node. Magic-link auth via signed-JWT HTTP-only cookies (no
              sessions table). Per-IP + per-email rate limiting on auth endpoints.
              All routes wrapped in try/catch with Sentry capture. Render-deployable
              with a one-shot Blueprint config.
            </TechBlock>
            <TechBlock title="Database">
              Neon Postgres. 19 migrations tracked in a `_migrations` table.
              Foreign keys cascade correctly on user delete (audited in Wave N).
              Postgres tsvector index for full-text search. JSONB for edition
              data + attribution_source.
            </TechBlock>
            <TechBlock title="AI / LLMs">
              gpt-4o-mini for writer + deep-dive + LLM-as-judge quality scoring.
              text-embedding-3-small for a pre-filter pass that cuts the
              source pool by cosine similarity to user beats before the writer
              call — drops cost ~70%. gpt-4o-mini-tts for audio editions.
              A/B prompt variants tracked in `prompt_variants` + `brief_scores`.
            </TechBlock>
            <TechBlock title="Email">
              Resend with inline-styled table-based HTML + plain-text fallback.
              All four template types (magic link, welcome, brief, forwarded edition)
              tested across Gmail / Apple Mail / iPhone Mail / Outlook. DKIM + SPF + DMARC
              docs for custom-domain deliverability.
            </TechBlock>
            <TechBlock title="Cron + delivery">
              Hourly Render cron job picks up users due in the current local hour,
              fetches the 8-source pool once per hour (shared), generates briefs
              per user, sends via Resend, posts to Slack channels, fires Expo push
              notifications. Idempotent via `unique (user_id, edition_date)`.
            </TechBlock>
            <TechBlock title="Observability">
              Sentry server + client. PostHog server + client (lazy-loaded, 70KB saved
              on initial bundle). Per-call OpenAI usage logged to `usage_log` table with
              micro-USD cost. Daily cost threshold check fires a Slack alert.
              Admin dashboard at `/admin` for top spenders / A/B variant winners / recent scores.
            </TechBlock>
            <TechBlock title="Mobile + extension">
              Expo (React Native) app with magic-link auth, AsyncStorage session,
              brief screen, Expo push notifications. Chrome MV3 new-tab override
              extension that renders today's brief on every new tab. Both share the
              same backend API.
            </TechBlock>
          </div>
        </section>

        <hr className="rule-gold mb-16" />

        {/* Interesting decisions */}
        <section className="mb-20 max-w-3xl mx-auto">
          <p className="eyebrow text-center mb-3">Worth talking about</p>
          <h3 className="font-display text-3xl md:text-4xl text-paper text-center leading-tight mb-10">
            Interesting choices the project made.
          </h3>
          <div className="space-y-8">
            <Decision title="Editor voice is the moat, not the features.">
              The prompt has 25+ explicit BAD/GOOD example pairs for what the editor's
              voice should and shouldn't sound like. A signature "The Editor's Take"
              field forces the model to commit to a position. The voice gets sharper
              every week as real failure modes get added to the prompt. Hard to clone
              in a weekend because it's not feature-shaped.
            </Decision>
            <Decision title="An editorial brand, not a SaaS dashboard.">
              Print typography (DM Serif Display + Crimson Pro), gold accents on ink,
              double-ruled mastheads, "Vol. I · No. xxxx" issue numbering, pull quotes
              as standalone units, By-the-Numbers sidebars. The product looks like a
              newspaper because it IS a newspaper.
            </Decision>
            <Decision title="Career-grounded, not entertainment-grounded.">
              Every story carries a "why it matters" line tied to the reader's role +
              hiring signal — pulled from "Who is hiring" HN threads and Layoffs.fyi.
              "An ML engineer at Anthropic-vs-Cohere kind of week" beats "AI continues
              to be transformative."
            </Decision>
            <Decision title="Embeddings pre-filter cut OpenAI cost 70%.">
              Before the writer call, the source pool (~110 clusters) gets cosine-ranked
              against the user's beats via text-embedding-3-small. Only the top 30 reach
              the writer model. At 1k users this is $50/mo vs. $200/mo with no pre-filter.
            </Decision>
            <Decision title="Cross-source deduplication, not a feed of feeds.">
              The same story often shows up on HN, GitHub Trending, Lobsters, and Reddit.
              URL canonicalization clusters them into one card with stacked source tags.
              The brief never repeats a story.
            </Decision>
            <Decision title="LLM-as-judge for drift detection.">
              Every brief gets a second pass through gpt-4o-mini that scores it 1–5 on
              coherence, career-relevance, and voice-fidelity. Scores join with a
              `prompt_variants` registry for A/B testing the prompt itself — winning
              variants get promoted to default.
            </Decision>
          </div>
        </section>

        <hr className="rule-double mb-12" />

        <section className="text-center max-w-2xl mx-auto pb-20">
          <p className="eyebrow mb-3">See it for yourself</p>
          <h3 className="font-display text-3xl md:text-4xl text-paper leading-tight mb-6">
            A real brief, generated this morning.
          </h3>
          <p className="font-serif-body text-paper-dim leading-relaxed mb-8">
            The annotated demo is live and uses a pre-warmed default edition.
            Loads in under a second.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
            <Link to="/demo" className="btn-primary">Read today's brief →</Link>
            <Link to="/try" className="btn-ghost">Or build one tuned to your role</Link>
          </div>
          <hr className="rule mb-6" />
          <p className="kicker">
            <Link to="/manifesto" className="text-gold hover:text-paper">Manifesto</Link>
            <span className="mx-3 text-muted">·</span>
            <Link to="/press" className="text-gold hover:text-paper">Press kit</Link>
            <span className="mx-3 text-muted">·</span>
            <Link to="/changelog" className="text-gold hover:text-paper">Changelog</Link>
            <span className="mx-3 text-muted">·</span>
            <Link to="/say-hi" className="text-gold hover:text-paper">Say hi</Link>
          </p>
        </section>
      </main>
    </>
  );
}

function Stat({ n, label, sub }) {
  return (
    <div>
      <p className="font-display text-4xl md:text-5xl text-gold leading-none mb-2">{n}</p>
      <p className="eyebrow mb-1">{label}</p>
      <p className="font-serif-body text-muted text-xs italic leading-snug">{sub}</p>
    </div>
  );
}

function Shot({ src, caption, compact }) {
  return (
    <figure className={compact ? "mb-0" : "mb-12"}>
      <div className="showcase-shot">
        <img src={src} alt={caption} loading="lazy" />
      </div>
      <figcaption className="font-serif-body italic text-paper-dim text-sm text-center mt-3 max-w-2xl mx-auto leading-relaxed">
        {caption}
      </figcaption>
    </figure>
  );
}

function TechBlock({ title, children }) {
  return (
    <div className="border-l-2 border-gold/40 pl-5">
      <p className="eyebrow mb-2">{title}</p>
      <p className="font-serif-body text-paper-dim leading-relaxed">{children}</p>
    </div>
  );
}

function Decision({ title, children }) {
  return (
    <div>
      <h4 className="font-display text-xl md:text-2xl text-paper leading-snug mb-2">{title}</h4>
      <p className="font-serif-body text-paper-dim leading-relaxed">{children}</p>
    </div>
  );
}
