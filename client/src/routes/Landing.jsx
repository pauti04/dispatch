import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";
import Story from "../components/Story.jsx";
import PullQuote from "../components/PullQuote.jsx";
import { api } from "../lib/api.js";

/* ─── Today's lede banner (small live element) ────────────── */
function LedeBanner() {
  const [text, setText] = useState(null);
  useEffect(() => {
    api
      .sample()
      .then((d) => setText(d.headline))
      .catch(() => {});
  }, []);
  if (!text) return null;
  return (
    // Live banner with today's headline — sits above the masthead. Tagged as a
    // landmark via role="region" + aria-label so axe doesn't flag it as orphan
    // content outside <main>.
    <section role="region" aria-label="Today's headline" className="lede-banner">
      <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center gap-4">
        <span className="kicker shrink-0">Today's lede</span>
        <span className="font-serif-body italic text-paper-dim text-sm leading-tight truncate">
          {text}
        </span>
      </div>
    </section>
  );
}

/* ─── How it works (3 steps) ──────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "I",
      title: "Tell us who's reading",
      body: "Your role, your level, the career domains you want intelligence on. Three steps, under a minute.",
    },
    {
      n: "II",
      title: "An editor reads the wires",
      body: "Each morning a language model reads HN, GitHub Trending, Lobsters, Reddit, arXiv, and Show HN — then writes only about what affects your field.",
    },
    {
      n: "III",
      title: "Career-grounded, five-minute read",
      body: "8 a.m. local, weekdays. Every story carries a 'why it matters' line about skill demand, hiring shifts, or what's worth learning.",
    },
  ];
  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <p className="eyebrow text-center mb-3">How it works</p>
      <h2 className="font-display text-4xl md:text-5xl text-paper text-center leading-tight mb-14">
        Three steps, then it shows up every morning.
      </h2>
      <div className="grid md:grid-cols-3 gap-10">
        {steps.map((s) => (
          <div key={s.n} className="text-center">
            <div className="font-display text-6xl text-gold leading-none mb-4">{s.n}</div>
            <h3 className="font-display text-2xl text-paper mb-3">{s.title}</h3>
            <p className="font-serif-body text-paper-dim leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Anatomy of a brief (three pillars only — less is more) ── */
function Anatomy() {
  const parts = [
    {
      label: "The Lede",
      desc: "One punchy sentence summarizing the day, set in display serif. The hook before you commit to reading.",
    },
    {
      label: "The Editor's Pick",
      desc: "One starred story per edition. The single most worth-your-time piece, with a proper paragraph treatment — not a TL;DR.",
    },
    {
      label: "The Pull Quote",
      desc: "A sharp, quotable line composed by the editor. Pure editorial drama in the middle of the page — the line a subscriber screenshots.",
    },
  ];
  return (
    <section className="bg-paper-fade py-20">
      <div className="max-w-5xl mx-auto px-6">
        <p className="eyebrow text-center mb-3">Anatomy of an edition</p>
        <h2 className="font-display text-4xl md:text-5xl text-paper text-center leading-tight mb-14">
          Built like a newspaper. Read like one.
        </h2>
        <div className="grid md:grid-cols-3 gap-x-10 gap-y-10">
          {parts.map((p) => (
            <div key={p.label} className="border-l-2 border-gold/40 pl-5">
              <p className="eyebrow mb-2">{p.label}</p>
              <p className="font-serif-body text-paper-dim leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Sample edition preview ──────────────────────────────── */
function SamplePreview() {
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .sample()
      .then(setBrief)
      .catch((e) => setError(String(e.message || e)));
  }, []);

  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <p className="eyebrow text-center mb-3">Today's sample edition</p>
      <h2 className="font-display text-4xl md:text-5xl text-paper text-center leading-tight mb-3">
        A real brief, generated just now.
      </h2>
      <p className="font-serif-body text-paper-dim text-lg text-center max-w-2xl mx-auto mb-12">
        This is what subscribers received this morning with a default set of beats. Yours would be tailored to the topics you pick.
      </p>

      <div className="sample-frame">
        {error && (
          <p className="font-mono text-sm text-muted text-center py-12">
            Couldn't load today's sample: {error}
          </p>
        )}
        {!brief && !error && (
          <div className="space-y-3 py-12">
            <div className="shimmer h-8 w-3/4 mx-auto" />
            <div className="shimmer h-4 w-1/2 mx-auto" />
            <div className="shimmer h-4 w-2/3 mx-auto" />
          </div>
        )}
        {brief && <SampleContent brief={brief} />}
      </div>

      <div className="text-center mt-10">
        <Link to="/demo" className="btn-primary">
          See the annotated demo →
        </Link>
      </div>
    </section>
  );
}

function SampleContent({ brief }) {
  const pickRef = brief.editor_pick;
  const pickStory = pickRef
    ? brief.sections.flatMap((s) => s.stories).find((st) => st.ref === pickRef)
    : null;
  const otherStories = brief.sections
    .flatMap((sec) => sec.stories.map((st) => ({ ...st, topic: sec.topic })))
    .filter((st) => st.ref !== pickRef)
    .slice(0, 3);

  return (
    <div className="p-8 md:p-12">
      <div className="text-center mb-8">
        <p className="eyebrow mb-3">Today's lede</p>
        <h3 className="font-display text-3xl md:text-4xl text-paper leading-tight mb-4">
          {brief.headline}
        </h3>
        {brief.editor_note && (
          <p className="font-serif-body italic text-paper-dim text-base leading-relaxed max-w-xl mx-auto">
            {brief.editor_note}
            <span className="block kicker mt-2 not-italic">— The Editor</span>
          </p>
        )}
      </div>

      <hr className="rule-gold mb-8" />

      {pickStory && (
        <div className="editors-pick-banner mb-8">
          <Story story={pickStory} isPick />
        </div>
      )}

      <PullQuote text={brief.pull_quote} />

      <div className="space-y-6 mt-6">
        {otherStories.map((st) => (
          <div key={st.ref}>
            <p className="kicker mb-2">{st.topic}</p>
            <Story story={st} />
          </div>
        ))}
      </div>

      <p className="text-center text-muted text-sm mt-8 italic">
        Showing {otherStories.length} of {brief.sections.reduce((n, s) => n + s.stories.length, 0)} stories in today's full edition.
      </p>
    </div>
  );
}

/* ─── FAQ ─────────────────────────────────────────────────── */
function FAQ() {
  const items = [
    {
      q: "Is this actually free?",
      a: "Yes. One email a day, on weekdays, free forever. No upsells, no premium tier hiding behind a paywall. We may add a paid tier later for power features (audio editions, more sources, etc.) but the daily brief stays free.",
    },
    {
      q: "How much email is this?",
      a: "One email per weekday. Five emails a week, at your local 8 a.m. (configurable). You can pause delivery from your account any time, or unsubscribe with one click from any email footer.",
    },
    {
      q: "Where do the stories come from?",
      a: "HackerNews top stories and GitHub Trending repositories, fetched fresh every morning. An AI editor reads the pool and writes only about stories that match your selected beats. Sources are linked on every story.",
    },
    {
      q: "Why an AI editor?",
      a: "Because reading HN every day is a part-time job, and a human curating it for thousands of people doesn't scale. The AI's job is light — read a pool of 30 stories, pick the ones matching your beats, write tight summaries. No invented stories. No invented quotes.",
    },
    {
      q: "What about privacy?",
      a: "We store your email, your beats, and your delivery preferences — nothing else. No tracking pixels in emails, no analytics scripts on the site. Delete your account any time and everything cascades.",
    },
    {
      q: "Can I see past editions?",
      a: "Yes. Every edition we send you has a permanent web URL (the 'View in browser' link in the email footer) so you can revisit, share, or print. A full archive view is coming next.",
    },
  ];
  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <p className="eyebrow text-center mb-3">Questions, answered</p>
      <h2 className="font-display text-4xl md:text-5xl text-paper text-center leading-tight mb-14">
        Things people ask before subscribing.
      </h2>
      <div className="space-y-2">
        {items.map((it, i) => (
          <FAQItem key={i} q={it.q} a={it.a} />
        ))}
      </div>
    </section>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button
        className="faq-q"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span className={`faq-icon ${open ? "open" : ""}`}>+</span>
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  );
}

/* ─── Footer ──────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-rule mt-12">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          <div>
            <p className="font-display text-2xl text-paper mb-2">Dispatch</p>
            <p className="font-serif-body text-muted text-sm italic leading-relaxed">
              A digital newspaper for working developers. More sections coming.
            </p>
          </div>
          <div>
            <p className="kicker mb-3">The paper</p>
            <ul className="space-y-2 font-serif-body text-paper-dim text-sm">
              <li><Link to="/demo" className="hover:text-paper">See today's brief</Link></li>
              <li><Link to="/today" className="hover:text-paper">Today's edition</Link></li>
              <li><Link to="/manifesto" className="hover:text-paper">Manifesto</Link></li>
            </ul>
          </div>
          <div>
            <p className="kicker mb-3">Get started</p>
            <ul className="space-y-2 font-serif-body text-paper-dim text-sm">
              <li><Link to="/signup" className="hover:text-paper">Subscribe</Link></li>
              <li><Link to="/login" className="hover:text-paper">Sign in</Link></li>
              <li><Link to="/say-hi" className="hover:text-paper">Say hi to the editor</Link></li>
            </ul>
          </div>
          <div>
            <p className="kicker mb-3">The fine print</p>
            <ul className="space-y-2 font-serif-body text-paper-dim text-sm">
              <li><Link to="/about" className="hover:text-paper">About Dispatch</Link></li>
              <li><Link to="/changelog" className="hover:text-paper">What changed this week</Link></li>
              <li><Link to="/privacy" className="hover:text-paper">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-paper">Terms</Link></li>
            </ul>
          </div>
        </div>
        <hr className="rule mb-6" />
        <p className="text-center kicker">
          © {new Date().getFullYear()} Dispatch · Edited by an attentive language model
        </p>
      </div>
    </footer>
  );
}

/* ─── Main Landing ────────────────────────────────────────── */
export default function Landing() {
  return (
    <>
      {/* Landing uses the default site-wide title/description — PageMeta is still
          mounted so the canonical URL is set to / (rather than left missing). */}
      <PageMeta />
      <LedeBanner />
      <Masthead subscript="The morning paper for working developers" />

      <main id="main" tabIndex={-1}>
      {/* Hero — sharper, more opinionated. Lead with the problem, then the product. */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="eyebrow mb-5">Dispatch · Tech</p>
        <h2 className="font-display text-5xl md:text-7xl text-paper leading-[0.95] mb-6">
          Reading HackerNews is a part-time job.
          <span className="block text-gold italic">Outsource it.</span>
        </h2>
        <p className="font-serif-body text-paper-dim text-lg leading-relaxed max-w-2xl mx-auto mb-10">
          An attentive AI editor reads the wires every morning — HN, GitHub Trending, Lobsters,
          Reddit, arXiv, Show HN — and writes you a five-minute brief in plain editorial voice.
          Tuned to your role. Grounded in what's actually shifting hiring. Free, weekdays, in your inbox.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap mb-3">
          <Link to="/demo" className="btn-primary">
            See today's brief
          </Link>
          <Link to="/signup" className="btn-ghost">
            Subscribe
          </Link>
        </div>
        <p className="text-center text-muted text-sm italic">
          No signup to preview. One-click unsubscribe. Free, forever.
        </p>
      </section>

      <hr className="rule-gold max-w-3xl mx-auto" />

      <SamplePreview />

      <HowItWorks />

      <Anatomy />

      <FAQ />

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="eyebrow mb-3">Ready?</p>
        <h2 className="font-display text-4xl md:text-5xl text-paper leading-tight mb-6">
          Your first edition arrives tomorrow.
        </h2>
        <p className="font-serif-body text-paper-dim leading-relaxed mb-8">
          Drop your email, pick your beats, and we'll do the reading.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/demo" className="btn-primary">
            See today's brief
          </Link>
          <Link to="/signup" className="btn-ghost">
            Subscribe
          </Link>
        </div>
      </section>
      </main>

      <Footer />
    </>
  );
}
