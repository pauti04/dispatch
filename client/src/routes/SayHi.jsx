import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";

/**
 * Wave M.3 — founder office hours / contact page.
 * The path from product → human, with one concrete way to start a conversation.
 */
export default function SayHi() {
  return (
    <>
      <PageMeta
        title="Say hi"
        description="One way to start a conversation with the editor. Tell us what you'd change about today's brief, what's broken on the demo, or what you'd want from Dispatch · Tech."
      />
      <Masthead subscript="Say hi to the editor" />
      <main id="main" tabIndex={-1} className="legal-page">
        <p className="eyebrow text-center mb-3">From the editor's desk</p>
        <h2 className="font-display text-4xl md:text-5xl text-paper text-center leading-tight mb-3">
          The inbox is open.
        </h2>
        <p className="font-serif-body italic text-paper-dim text-lg text-center mb-12">
          One developer reads every email. Yes, really.
        </p>

        <hr className="rule-gold mb-10" />

        <article className="legal-body">
          <p>
            Dispatch is run by one developer in the open. There's no support queue, no
            ticketing system, no "we'll get back to you in 3-5 business days." If you write,
            the founder reads it — usually the same day, often the same hour.
          </p>
          <p>
            <strong>What's worth writing about:</strong> a brief that felt off — a story
            that didn't belong, a line that sounded like marketing, a beat you wanted but
            didn't get. A feature that broke. A feature that you wish existed. A way
            Dispatch could be more useful for the work you actually do. Anything you'd say
            at a meetup.
          </p>
          <p>
            <strong>What's less useful right now:</strong> requests for paid tier features
            (we're staying free for the foreseeable future), enterprise inquiries (not yet),
            partnership pitches (not yet, but bookmark us for later).
          </p>
        </article>

        <hr className="rule-gold mt-12 mb-10" />

        <p className="eyebrow text-center mb-3">Three ways</p>
        <h3 className="font-display text-3xl text-paper text-center leading-tight mb-8">
          Pick whatever's easiest.
        </h3>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="border border-rule rounded-sm p-6 text-center">
            <p className="kicker mb-2">Email</p>
            <p className="font-serif-body text-paper-dim text-sm leading-relaxed mb-4">
              The slowest, and the one I take most seriously.
            </p>
            <a
              href="mailto:hi@dispatch.local"
              className="font-display text-xl text-gold hover:text-paper break-all"
            >
              hi@dispatch.local
            </a>
          </div>
          <div className="border border-rule rounded-sm p-6 text-center">
            <p className="kicker mb-2">Reply to any brief</p>
            <p className="font-serif-body text-paper-dim text-sm leading-relaxed mb-4">
              Once you subscribe, every email is a thread. Reply lands in my inbox directly.
            </p>
            <Link to="/signup" className="font-display text-xl text-gold hover:text-paper">
              Subscribe first →
            </Link>
          </div>
          <div className="border border-rule rounded-sm p-6 text-center">
            <p className="kicker mb-2">Office hours</p>
            <p className="font-serif-body text-paper-dim text-sm leading-relaxed mb-4">
              For early subscribers — a 25-minute call. I want to know what you'd change.
            </p>
            <a
              href="mailto:hi@dispatch.local?subject=Office%20hours"
              className="font-display text-xl text-gold hover:text-paper"
            >
              Book one →
            </a>
          </div>
        </div>

        <hr className="rule-double mt-12 mb-6" />
        <p className="text-center kicker">
          <Link to="/manifesto" className="text-gold hover:text-paper">Read the manifesto</Link>
          <span className="mx-3 text-muted">·</span>
          <Link to="/demo" className="text-gold hover:text-paper">See today's brief</Link>
        </p>
      </main>
    </>
  );
}
