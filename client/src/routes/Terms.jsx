import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";

export default function Terms() {
  return (
    <>
      <Masthead subscript="Terms of service" />
      <main className="legal-page">
        <p className="eyebrow text-center mb-3">The fine print</p>
        <h2 className="font-display text-4xl md:text-5xl text-paper text-center leading-tight mb-3">
          Terms of service.
        </h2>
        <p className="kicker text-center mb-12">
          Reasonable. Not lawyered into oblivion.
        </p>

        <hr className="rule-gold mb-10" />

        <article className="legal-body">
          <h3>What Dispatch is</h3>
          <p>
            Dispatch · Tech is a daily career-intelligence brief for working developers, AI-curated
            from public sources. We send one email a weekday morning, tuned to the role and beats
            you pick.
          </p>

          <h3>Use it sensibly</h3>
          <p>
            Sign up with your real email. Don't try to game the system (rate-limit dodging,
            scraping, impersonation, anything that messes with other readers). Don't republish
            entire editions verbatim under your own brand — share the source links and the
            permalink to the edition instead.
          </p>

          <h3>What we provide</h3>
          <p>
            Best-effort daily delivery. We use battle-tested vendors (Neon, Resend, Render, Vercel)
            but the brief can occasionally arrive late or miss a day if a source is down or the
            language model has a bad morning. If a day's edition is materially broken, write to us
            and we'll figure it out.
          </p>

          <h3>What we don't provide</h3>
          <p>
            Career advice. Investment advice. Hiring guarantees. The brief surfaces signal and
            frames it carefully, but every reader's situation is their own. Treat it as a thoughtful
            friend's morning summary, not a directive.
          </p>

          <h3>Free, for now</h3>
          <p>
            Dispatch is free at the time of writing. If we ever introduce a paid tier, the daily
            brief stays free; only optional extras (e.g. audio editions, deeper archives) would gate
            behind a price. We'd announce a change at least 30 days in advance and never quietly
            charge anyone.
          </p>

          <h3>Account termination</h3>
          <p>
            You can delete your account at any time from <em>Account → Delete</em>. We can suspend
            an account for abuse (sustained scraping, harassment of other readers, etc.). We'll
            email a reason before doing so unless it's actively dangerous.
          </p>

          <h3>Liability</h3>
          <p>
            Dispatch is provided "as is." We aren't liable for indirect or consequential damages
            stemming from the brief — if a story we summarize turns out to be incomplete, that's not
            grounds for a claim. Where required by law, the maximum liability is the total amount
            you've paid for Dispatch, which is currently zero.
          </p>

          <h3>Governing law</h3>
          <p>
            Until we incorporate a legal entity (which will happen before any paid offering), these
            terms are governed by the law of the place the operator lives.
          </p>

          <h3>Contact</h3>
          <p>
            Email <a href="mailto:hi@dispatch.local" className="text-gold">hi@dispatch.local</a>{" "}
            with any questions. A human reads it.
          </p>
        </article>

        <hr className="rule-double mt-16 mb-6" />
        <p className="text-center kicker">
          <Link to="/" className="hover:text-paper">← Back to Dispatch</Link>
        </p>
      </main>
    </>
  );
}
