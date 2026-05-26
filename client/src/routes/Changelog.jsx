import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";

/**
 * Wave M.3 — the public changelog.
 * Builds trust with early subscribers + signals momentum. Founder-written. Hand-edited
 * for now (no admin form) — when an entry lands worth shipping, append it here.
 */
const ENTRIES = [
  {
    week: "May 18 – 24, 2026",
    items: [
      "Sharpened the front page: one-liner pitch, opinionated hero, fewer CTAs.",
      "New /demo page — a real Dispatch edition with annotations that explain the craft.",
      "Per-role pre-warmed sample brief so the demo loads in under a second.",
      "Tightened the editor prompt to ban more LinkedIn-isms and tech-pundit cliché.",
      "Founder narrative + 'what Dispatch is not' added to /about.",
      "New /manifesto and /press pages.",
      "Slimmed the navigation — Discover, Streak, Referrals, browser extension hidden until the wedge is sharp.",
    ],
  },
  {
    week: "May 11 – 17, 2026",
    items: [
      "Real Privacy and Terms pages replaced placeholders.",
      "Mobile navigation drawer + reading progress bar.",
      "Keyboard shortcuts: `/` to search, `?` for help, `g h/t/a/s/d/r` to navigate.",
      "Maskable PWA icon for proper home-screen install.",
      "Microcopy pass across the 404, onboarding, and footer.",
    ],
  },
  {
    week: "May 4 – 10, 2026",
    items: [
      "Full-text search across past editions.",
      "Discover feed surfacing the week's most-bookmarked stories (community signal).",
      "Slack OAuth scaffold + push-token plumbing for the mobile app.",
      "Public bookmark profiles at /p/<handle>.",
    ],
  },
  {
    week: "April 27 – May 3, 2026",
    items: [
      "Embeddings pre-filter — pool gets cosine-ranked before the writer call. Cuts cost ~70%.",
      "LLM-as-judge quality scoring on every generated brief.",
      "A/B prompt-variant testing framework with score-joined results.",
      "Per-user OpenAI usage logging + admin cost dashboard.",
      "Content moderation pass against crypto/scam patterns at the cluster stage.",
      "Per-email-address auth rate limit on /api/auth/request.",
    ],
  },
];

export default function Changelog() {
  return (
    <>
      <PageMeta
        title="Changelog"
        description="What's changed on Dispatch this week. Hand-edited by the editor — when something lands worth mentioning, it shows up here."
      />
      <Masthead subscript="What changed this week" />
      <main className="legal-page">
        <p className="eyebrow text-center mb-3">Changelog</p>
        <h2 className="font-display text-4xl md:text-5xl text-paper text-center leading-tight mb-3">
          The week, in shipped things.
        </h2>
        <p className="font-serif-body italic text-paper-dim text-center mb-12">
          A running log of what got built, what got cut, and what got tightened.
        </p>

        <hr className="rule-gold mb-12" />

        <div className="space-y-12">
          {ENTRIES.map((entry, i) => (
            <section key={i}>
              <p className="kicker mb-3">{entry.week}</p>
              <hr className="rule mb-5" />
              <ul className="font-serif-body text-paper-dim text-lg leading-relaxed list-disc pl-5 space-y-2">
                {entry.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <hr className="rule-double mt-16 mb-6" />
        <p className="text-center kicker">
          <Link to="/manifesto" className="text-gold hover:text-paper">Read the manifesto</Link>
          <span className="mx-3 text-muted">·</span>
          <Link to="/say-hi" className="text-gold hover:text-paper">Suggest a change</Link>
        </p>
      </main>
    </>
  );
}
