import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";
import Story from "../components/Story.jsx";
import PullQuote from "../components/PullQuote.jsx";
import { api } from "../lib/api.js";
import { track, events } from "../lib/analytics.js";

/**
 * Wave M.2 — the annotated demo edition.
 *
 * A real, pre-warmed Dispatch edition rendered with small gold callouts that explain
 * the craft of the page as you scroll. Replaces the "go pick beats first, then see a
 * brief" flow as the canonical front door — visitors see VALUE before being asked for
 * commitment. Ends with a "what just happened" reveal + a sticky subscribe CTA.
 *
 * Loads from /api/sample (server-cached, ≤6h fresh) so it's typically <500ms.
 */
export default function Demo() {
  const [brief, setBrief] = useState(null);
  const [err, setErr] = useState(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    track(events.DEMO_VIEWED);
    api
      .sample()
      .then(setBrief)
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  useEffect(() => {
    // Trigger the "what just happened" reveal after the first paint
    if (!brief) return;
    const t = setTimeout(() => setRevealed(true), 1200);
    return () => clearTimeout(t);
  }, [brief]);

  if (err) {
    return (
      <>
        <Masthead subscript="The demo couldn't load" />
        <main id="main" tabIndex={-1} className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="font-mono text-sm text-muted break-words mb-6">{err}</p>
          <Link to="/" className="btn-primary">Back to Dispatch</Link>
        </main>
      </>
    );
  }

  if (!brief) {
    return (
      <>
        <Masthead subscript="Loading today's annotated edition…" />
        <main id="main" tabIndex={-1} className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="space-y-3">
            <div className="shimmer h-8 w-3/4 mx-auto" />
            <div className="shimmer h-4 w-1/2 mx-auto" />
            <div className="shimmer h-4 w-2/3 mx-auto" />
          </div>
        </main>
      </>
    );
  }

  const allStories = brief.sections.flatMap((s) =>
    s.stories.map((st) => ({ ...st, topic: s.topic }))
  );
  const pickStory = brief.editor_pick
    ? allStories.find((st) => st.ref === brief.editor_pick)
    : null;
  const otherStories = allStories.filter((st) => st.ref !== brief.editor_pick).slice(0, 3);
  // Use any story that has a why_it_matters line for the annotation example.
  // Falls back to the pick if it's the only one with one.
  const whyExample =
    otherStories.find((st) => st.why_it_matters) ||
    (pickStory?.why_it_matters ? pickStory : null);
  const totalScanned =
    (brief.counts?.hn || 0) +
    (brief.counts?.gh || 0) +
    (brief.counts?.lobsters || 0) +
    (brief.counts?.reddit || 0) +
    (brief.counts?.arxiv || 0) +
    (brief.counts?.show_hn || 0);

  return (
    <>
      <PageMeta
        title="Annotated edition"
        description="A real Dispatch edition with editorial annotations — see the craft of the page. The Editor's Pick, the why-it-matters lines, the pull quote, the by-the-numbers, all called out."
      />
      <Masthead subscript="Demo · annotated edition" />

      {/* Sticky CTA strip — always visible during the read. <nav> landmark so
          axe doesn't flag it as orphan content outside <main>. */}
      <nav aria-label="Subscribe" className="cta-strip no-print sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <p className="font-serif-body italic text-paper-dim text-sm">
            This is what subscribers received this morning. Yours would be tuned to your role.
          </p>
          <div className="flex gap-2">
            <Link to="/try" className="btn-ghost">Tune to my role</Link>
            <Link to="/signup" className="btn-primary">Subscribe — it's free</Link>
          </div>
        </div>
      </nav>

      <main id="main" tabIndex={-1} className="max-w-4xl mx-auto px-6 py-12">
        {/* Intro */}
        <section className="text-center mb-12 max-w-2xl mx-auto">
          <p className="eyebrow mb-3">How to read this paper</p>
          <h2 className="font-display text-3xl md:text-4xl text-paper leading-tight mb-4">
            Below is a real Dispatch edition.
          </h2>
          <p className="font-serif-body text-paper-dim text-lg leading-relaxed">
            The gold callouts explain the craft of the page. Every piece is here for a reason —
            and every choice is one we'd make again tomorrow.
          </p>
        </section>

        <hr className="rule-gold mb-12" />

        {/* The Lede */}
        <section className="mb-10">
          <Callout
            label="The Lede"
            body="One punchy sentence summarizing the day, set in display serif. The hook before you commit to reading further."
          />
          <div className="text-center mb-3 mt-6">
            <p className="eyebrow mb-3">Today's lede</p>
            <h2 className="font-display text-4xl md:text-5xl text-paper leading-tight">
              {brief.headline}
            </h2>
          </div>
        </section>

        {/* The Editor's Note */}
        {brief.editor_note && (
          <section className="mb-12">
            <Callout
              label="The Editor's Note"
              body="Two sentences in editorial voice — the difference between an aggregator and a newspaper. This is where the day gets framed."
            />
            <p className="font-serif-body italic text-paper-dim text-lg leading-relaxed max-w-2xl mx-auto text-center mt-6">
              {brief.editor_note}
              <span className="block kicker mt-2 not-italic">— The Editor</span>
            </p>
          </section>
        )}

        <hr className="rule-gold mb-12" />

        {/* The Editor's Pick */}
        {pickStory && (
          <section className="mb-12">
            <Callout
              label="The Editor's Pick"
              body="One starred story per edition. The single most worth your time today — framed with gold rules and a proper paragraph treatment, not a TL;DR. This is what to read if you only read one thing."
            />
            <div className="editors-pick-banner mt-6">
              <Story story={pickStory} isPick />
            </div>
          </section>
        )}

        {/* The Pull Quote */}
        {brief.pull_quote && (
          <section className="mb-12">
            <Callout
              label="The Pull Quote"
              body="A sharp, quotable line composed by the editor. Pure editorial drama. The line a subscriber screenshots into a group chat."
            />
            <div className="mt-6">
              <PullQuote text={brief.pull_quote} />
            </div>
          </section>
        )}

        {/* The Why-it-matters line — uses the first non-pick story when available,
            falls back to the pick itself so the callout always has an example to stand on. */}
        {whyExample && whyExample !== pickStory && (
          <section className="mb-12">
            <Callout
              label="The Why-it-matters line"
              body="Every story carries one. Grounded in your role and what's actually shifting in hiring — not generic news framing. This is the difference between Dispatch and a feed."
            />
            <div className="mt-6">
              <p className="kicker mb-2">{whyExample.topic || brief.sections[0]?.topic}</p>
              <Story story={whyExample} />
            </div>
          </section>
        )}

        {/* Remaining stories without annotation */}
        {otherStories.length > 1 && (
          <section className="mb-12">
            <p className="kicker mb-3 text-center">And a few more from today's edition</p>
            <div className="space-y-6">
              {otherStories.slice(whyExample === pickStory ? 0 : 1).map((st) => (
                <Story key={st.ref} story={st} />
              ))}
            </div>
          </section>
        )}

        <hr className="rule-double mb-12" />

        {/* "What just happened" reveal — the closing moment */}
        <section
          className={`bg-paper-fade text-center py-10 px-6 mb-12 transition-opacity duration-700 ${
            revealed ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="eyebrow mb-3">What just happened</p>
          <p className="font-display text-2xl md:text-3xl text-paper leading-snug max-w-3xl mx-auto mb-4">
            An AI editor read{" "}
            <span className="text-gold">{totalScanned}</span> stories across six sources,
            picked the ones that matter, and wrote this in under fifteen seconds.
          </p>
          <p className="font-serif-body italic text-paper-dim text-lg leading-relaxed max-w-xl mx-auto mb-6">
            Imagine this in your inbox at 8 a.m., tuned to your role, every weekday morning.
            That's Dispatch. It's free.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/signup" className="btn-primary">
              Get one tomorrow morning →
            </Link>
            <Link to="/try" className="btn-ghost">
              First, tune it to my role
            </Link>
          </div>
        </section>

        {/* Footer line */}
        <div className="text-center">
          <p className="kicker mb-2">Read the manifesto</p>
          <p className="font-serif-body text-paper-dim italic text-sm max-w-md mx-auto">
            <Link to="/manifesto" className="text-gold hover:text-paper">
              Six things Dispatch believes →
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}

function Callout({ label, body }) {
  // role="note" (not <aside>) — these annotations are inline editorial commentary
  // within the main demo flow, not a separate complementary region. Using <aside>
  // here trips the "complementary nested in main" landmark rule.
  return (
    <div role="note" aria-label={label} className="demo-callout">
      <div className="demo-callout-arrow" aria-hidden>↓</div>
      <p className="kicker mb-1">{label}</p>
      <p className="font-serif-body text-paper-dim text-sm leading-relaxed">{body}</p>
    </div>
  );
}
