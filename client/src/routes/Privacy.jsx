import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";

export default function Privacy() {
  return (
    <>
      <Masthead subscript="Privacy policy" />
      <main className="legal-page">
        <p className="eyebrow text-center mb-3">The fine print</p>
        <h2 className="font-display text-4xl md:text-5xl text-paper text-center leading-tight mb-3">
          Privacy policy.
        </h2>
        <p className="kicker text-center mb-12">
          Plain English. Short. Last updated when the editor felt it should be.
        </p>

        <hr className="rule-gold mb-10" />

        <article className="legal-body">
          <h3>What we store</h3>
          <p>
            Your email address (so we can send you the brief), the role and skill level you picked
            (so we can tune the brief), the beats you selected (so we can pick the right stories),
            and the timezone + delivery time you chose (so we can send on schedule). That's it on the
            account side.
          </p>
          <p>
            On the activity side: each edition we generate for you (so you can browse your archive),
            the stories you save (so you can find them later), and the stories you click (so the
            brief can learn what you actually read). That's also it.
          </p>

          <h3>What we don't store</h3>
          <p>
            We don't put tracking pixels in emails. We don't run analytics scripts on the marketing
            site. We don't sell anything to advertisers because we don't have any. We don't know
            your IP address beyond what the standard server logs hold for diagnostic purposes (and
            those rotate within a week).
          </p>

          <h3>Who sees your data</h3>
          <p>
            Only us, and three vendors strictly necessary to deliver the product:{" "}
            <strong className="text-paper">Neon</strong> stores the database;{" "}
            <strong className="text-paper">Resend</strong> sends the email;{" "}
            <strong className="text-paper">OpenAI</strong> writes the brief.
          </p>
          <p>
            OpenAI receives the headlines we pull from public sources (HackerNews, GitHub Trending,
            arXiv, etc.) and your beat list. It does not receive your email, name, or any private
            identifier. Per OpenAI's API terms, that content is not used to train their models.
          </p>

          <h3>Cookies</h3>
          <p>
            One: a signed HTTP-only session cookie set when you sign in via magic link. It says
            "this browser belongs to user X." Nothing else. No third-party cookies, no
            advertising/marketing cookies, no analytics.
          </p>

          <h3>How to delete your data</h3>
          <p>
            From your account page, click <em>Delete account</em>. Everything — your user record,
            preferences, subscription, editions, bookmarks, click history — cascade-deletes within
            seconds. We don't keep a backup copy for "auditing" or whatever euphemism.
          </p>

          <h3>Children</h3>
          <p>
            Dispatch is built for working developers and students. We don't knowingly collect data
            from anyone under 13. If a parent or guardian thinks we have, email us and we'll delete
            it.
          </p>

          <h3>Changes</h3>
          <p>
            If we change anything that matters, we'll update this page and email subscribers at
            least 14 days before it takes effect. No 60-page legal updates buried in your inbox.
          </p>

          <h3>How to reach us</h3>
          <p>
            Email <a href="mailto:hi@dispatch.local" className="text-gold">hi@dispatch.local</a>{" "}
            (or whatever address the footer shows when we're live). A human reads it.
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
