import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";

/**
 * Wave M.3 — the first-100 founder-led landing.
 * Separate from the main /signup so we can frame Dispatch as early-access for working
 * developers and route those signups to a manual onboarding flow. Lives off the main nav.
 */
export default function Early() {
  return (
    <>
      <PageMeta
        title="First 100 readers"
        description="An invitation to the first 100 working developers. Read Dispatch for two weeks, tell us what's broken, help shape the product. Founder-led onboarding."
      />
      <Masthead subscript="Early subscribers · first 100 working developers" />
      <main id="main" tabIndex={-1} className="legal-page">
        <p className="eyebrow text-center mb-3">An invitation</p>
        <h2 className="font-display text-4xl md:text-5xl text-paper text-center leading-tight mb-3">
          Read Dispatch for two weeks and tell us what's broken.
        </h2>
        <p className="font-serif-body italic text-paper-dim text-center mb-12">
          We're looking for the first 100 working developers to shape the paper.
        </p>

        <hr className="rule-gold mb-10" />

        <article className="legal-body">
          <p>
            Dispatch is in pre-launch. The product exists; the daily brief works; the email
            pipeline is built. What we're missing is the most important thing — a hundred
            working developers reading it every morning and telling us what's off.
          </p>
          <p>
            This page is the way in. If you subscribe via the form below, you join the early
            cohort. The deal: you read Dispatch every weekday for two weeks. We email you a
            short questionnaire after week one and again after week two. In return, you get
            the editor's attention. If a story line in your brief sounded wrong, the editor
            wants to hear about it. If the role-tuning isn't quite right, we'll iterate on it
            with you specifically. That's the trade.
          </p>
          <p>
            We don't want a thousand subscribers right now. We want a hundred careful readers
            who will tell us the truth.
          </p>
        </article>

        <hr className="rule-gold mt-12 mb-10" />

        <p className="eyebrow text-center mb-3">What you'd be signing up for</p>
        <ul className="font-serif-body text-paper-dim text-lg leading-relaxed list-disc pl-6 mb-12 space-y-2 max-w-xl mx-auto">
          <li>One short email per weekday at 8 a.m. local. Five minutes to read.</li>
          <li>Two short questionnaires (one after week 1, one after week 2). Three questions each.</li>
          <li>Direct access to the founder by email. Reply to any brief.</li>
          <li>An optional 25-minute call after week 2 to talk about what you'd change.</li>
          <li>Free, forever — that's the standing promise for the daily brief.</li>
        </ul>

        <hr className="rule-gold mb-10" />

        <p className="eyebrow text-center mb-3">Join the cohort</p>
        <div className="text-center">
          <Link to="/signup" className="btn-primary">
            Subscribe me — early-cohort tag
          </Link>
          <p className="font-serif-body italic text-muted text-sm mt-4 max-w-md mx-auto">
            (Same magic-link signup as everyone — we tag your account so we know to
            include you in the week-1 and week-2 questionnaires.)
          </p>
        </div>

        <hr className="rule-double mt-16 mb-6" />
        <p className="text-center kicker">
          <Link to="/say-hi" className="text-gold hover:text-paper">Want to talk first? Say hi →</Link>
        </p>
      </main>
    </>
  );
}
