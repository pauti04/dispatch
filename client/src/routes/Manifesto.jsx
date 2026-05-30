import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";

/**
 * Wave M.1 — the manifesto. Six short paragraphs, each committing to one thing.
 * Reusable surface for founder posts, fundraising-later, hiring-later, copy-paste-able.
 * Read in under 90 seconds. Each paragraph stands on its own.
 */
export default function Manifesto() {
  const tenets = [
    {
      label: "Less, on purpose.",
      body: "The world has enough feeds. Dispatch picks five things, ignores four hundred, and stands behind the picks. If a story doesn't earn a why-it-matters line, it doesn't earn a slot. Editing is mostly subtraction.",
    },
    {
      label: "Voice over volume.",
      body: "A brief that sounds like a person is worth ten that sound like a machine. The Dispatch editor reads like a thoughtful friend with a newsroom job — not a press release, not a thread, not a roundup. Voice is the product.",
    },
    {
      label: "Grounded in your career.",
      body: "Tech news without context is trivia. Every story carries a line about what it means for skill demand, hiring shifts, or what's worth learning — grounded in the role you told us you have. Career-grounded reading is a habit; entertainment-grounded reading is a leak.",
    },
    {
      label: "No doomscroll.",
      body: "Dispatch is a five-minute morning read. There is no infinite scroll. There are no notifications nudging you back. When you've finished today's edition, the product is over until tomorrow. That is the feature.",
    },
    {
      label: "No ads, ever.",
      body: "An advertiser-funded paper writes for the advertiser. Dispatch writes for the reader. The brief is free because we want the reader to be the customer. We'll add paid power features one day; the daily brief stays free.",
    },
    {
      label: "Read every reply.",
      body: "The editor reads every email back. If a brief is off — a story that didn't belong, a line that sounded like marketing, a beat that's not landing — there's an inbox at the other end and someone in it. The product gets better because subscribers tell us what's broken.",
    },
  ];

  return (
    <>
      <PageMeta
        title="Manifesto"
        description="Six things Dispatch believes about reading, attention, and writing for working developers. Each paragraph commits to one thing. Read in under 90 seconds."
      />
      <Masthead subscript="Six things Dispatch believes" />
      <main id="main" tabIndex={-1} className="legal-page">
        <p className="eyebrow text-center mb-3">A manifesto</p>
        <h2 className="font-display text-4xl md:text-5xl text-paper text-center leading-tight mb-3">
          What we're trying to make.
        </h2>
        <p className="kicker text-center mb-12">Read in 90 seconds.</p>

        <hr className="rule-gold mb-12" />

        <article className="space-y-10">
          {tenets.map((t, i) => (
            <section key={i}>
              <p className="kicker mb-2">{toRoman(i + 1)}</p>
              <h3 className="font-display text-2xl md:text-3xl text-paper leading-snug mb-3">
                {t.label}
              </h3>
              <p className="font-serif-body text-paper-dim text-lg leading-relaxed">{t.body}</p>
            </section>
          ))}
        </article>

        <hr className="rule-double mt-16 mb-6" />
        <p className="text-center kicker">
          <Link to="/demo" className="text-gold hover:text-paper">See today's brief →</Link>
          <span className="mx-3 text-muted">·</span>
          <Link to="/signup" className="text-gold hover:text-paper">Subscribe</Link>
        </p>
      </main>
    </>
  );
}

function toRoman(n) {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n - 1] || String(n);
}
