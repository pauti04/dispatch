import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";

/**
 * Wave M.1 — press kit. So when someone wants to write about Dispatch
 * they don't have to email asking for screenshots. Everything in one page.
 */
export default function Press() {
  return (
    <>
      <PageMeta
        title="Press kit"
        description="Everything you need to write about Dispatch — the one-liner, the founder paragraph, screenshots, sample edition, contact. So you don't have to email asking."
      />
      <Masthead subscript="Press kit · everything in one place" />
      <main id="main" tabIndex={-1} className="legal-page">
        <p className="eyebrow text-center mb-3">Press kit</p>
        <h2 className="font-display text-4xl md:text-5xl text-paper text-center leading-tight mb-3">
          Writing about Dispatch?
        </h2>
        <p className="font-serif-body italic text-paper-dim text-center mb-12">
          Everything you need is here. If anything's missing, the editor reads every email.
        </p>

        <hr className="rule-gold mb-10" />

        <section className="mb-12">
          <p className="kicker mb-3">The one-liner</p>
          <p className="font-display text-2xl md:text-3xl text-paper leading-snug border-l-2 border-gold pl-5">
            The morning paper for working developers — written by an editor that actually read
            this week's wires.
          </p>
        </section>

        <section className="mb-12">
          <p className="kicker mb-3">The short version</p>
          <p className="font-serif-body text-paper-dim text-lg leading-relaxed">
            Dispatch is a daily five-minute email brief for working developers. An AI editor
            reads HackerNews, GitHub Trending, Lobsters, Reddit, arXiv, Show HN, and the
            month's hiring + layoff signal each morning, then writes a tight, editorially-voiced
            brief tuned to the reader's role. Free, weekdays, 8 a.m. local. Built on the
            premise that an editor curates better than an algorithm — even when the editor is
            an LLM.
          </p>
        </section>

        <section className="mb-12">
          <p className="kicker mb-3">The 30-second pitch</p>
          <ul className="font-serif-body text-paper-dim text-lg leading-relaxed list-disc pl-5 space-y-2">
            <li>Reading HackerNews every morning is a part-time job. Dispatch outsources it.</li>
            <li>One brief per weekday, tuned to your role and beats. Five minutes.</li>
            <li>Six sources, embedding-based pre-filter, single editor-voiced output.</li>
            <li>Every story has a "why this matters" line grounded in hiring + career arc.</li>
            <li>Free. No ads. No upsell. The editor reads every reply.</li>
          </ul>
        </section>

        <section className="mb-12">
          <p className="kicker mb-3">Key facts</p>
          <dl className="grid md:grid-cols-2 gap-x-10 gap-y-4 font-serif-body text-paper-dim">
            <div>
              <dt className="eyebrow mb-1">Format</dt>
              <dd>Daily email, weekdays, 8 a.m. local. Web archive permalink for every issue.</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Sources</dt>
              <dd>HackerNews · GitHub Trending · Lobsters · Reddit · arXiv · Show HN · "Who is hiring" + Layoffs.fyi.</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Model</dt>
              <dd>gpt-4o-mini, with embeddings-based pre-filter to cut the pool before the writer call.</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Tooling</dt>
              <dd>Vite + React + Tailwind frontend. Express + Postgres + Resend backend. Open source-friendly stack.</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Price</dt>
              <dd>Free. Forever. For the daily brief. No paid tier hiding behind a paywall.</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Status</dt>
              <dd>Pre-launch. Founder-led, looking for the first 100 working developers.</dd>
            </div>
          </dl>
        </section>

        <section className="mb-12">
          <p className="kicker mb-3">Founder bio</p>
          <p className="font-serif-body text-paper-dim text-lg leading-relaxed">
            A developer building Dispatch because the morning information habit was broken
            and the existing newsletters weren't fixing it. Background in product engineering;
            writes the prompt, reads every reply, prefers tight editing to clever marketing.
          </p>
        </section>

        <section className="mb-12">
          <p className="kicker mb-3">Sample edition</p>
          <p className="font-serif-body text-paper-dim text-lg leading-relaxed mb-3">
            A real, freshly-generated Dispatch edition is always available at
            {" "}<Link to="/today" className="text-gold hover:text-paper">/today</Link>
            {" "}— public, no signup. An annotated walkthrough lives at
            {" "}<Link to="/demo" className="text-gold hover:text-paper">/demo</Link>.
          </p>
        </section>

        <section className="mb-12">
          <p className="kicker mb-3">Assets</p>
          <ul className="font-serif-body text-paper-dim text-lg leading-relaxed list-disc pl-5 space-y-2">
            <li><a href="/icon.svg" className="text-gold hover:text-paper">Mark (SVG)</a> — the "D" wordmark on ink</li>
            <li><a href="/icon-maskable.svg" className="text-gold hover:text-paper">Mark (maskable SVG)</a> — for app icons</li>
            <li><a href="/og.png" className="text-gold hover:text-paper">Open Graph card</a> — for embeds</li>
            <li>Screenshots: open any edition page and screenshot. The paper IS the screenshot.</li>
          </ul>
        </section>

        <section className="mb-12">
          <p className="kicker mb-3">Brand</p>
          <p className="font-serif-body text-paper-dim text-lg leading-relaxed">
            The look is intentional: a paper newspaper, redrawn for the screen.
            Ink (#0d0c0a) on cream (#f4ecdc), gold accents (#c9a14a), DM Serif Display for
            display, Crimson Pro for body. Tagline: <em>"The wire, edited."</em> The masthead
            is hand-set; the rules are double-ruled; the colophon is a colophon, not a footer.
          </p>
        </section>

        <hr className="rule-double mt-16 mb-6" />
        <p className="text-center kicker">
          <Link to="/say-hi" className="text-gold hover:text-paper">Email the editor →</Link>
          <span className="mx-3 text-muted">·</span>
          <Link to="/manifesto" className="text-gold hover:text-paper">Read the manifesto</Link>
        </p>
      </main>
    </>
  );
}
