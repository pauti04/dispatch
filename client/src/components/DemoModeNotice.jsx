import { Link } from "react-router-dom";
import Masthead from "./Masthead.jsx";
import PageMeta from "./PageMeta.jsx";

/**
 * Shown when an authed feature is accessed in the static demo deploy.
 * Replaces the previous ugly raw-error states ("expected JSON, got text/plain",
 * "X UNAVAILABLE") with a friendly editor-voiced explanation.
 */
export default function DemoModeNotice({ feature, subscript = "A demo, not a subscription" }) {
  const metaTitle = feature ? `${feature} · demo mode` : "Demo mode";
  const metaDesc = feature
    ? `${feature} requires a real Dispatch subscription. You're viewing the unlisted public demo — try the annotated edition at /demo.`
    : "You're viewing the unlisted public demo of Dispatch. Try the annotated edition at /demo.";
  return (
    <>
      <PageMeta title={metaTitle} description={metaDesc} />
      <Masthead subscript={subscript} />
      <main id="main" tabIndex={-1} className="max-w-xl mx-auto px-6 py-20 text-center">
        <p className="eyebrow mb-4">Demo mode</p>
        <h2 className="font-display text-3xl md:text-4xl text-paper leading-tight mb-5">
          {feature || "This page"} works for real subscribers.
        </h2>
        <p className="font-serif-body text-paper-dim leading-relaxed mb-8">
          You're reading the public demo of Dispatch — the front pages, the
          annotated edition, the manifesto. {feature || "This view"}{" "}
          requires a real account and a live backend, neither of which lives in
          this static deploy.
        </p>
        <p className="font-serif-body italic text-paper-dim mb-10">
          When Dispatch ships for real subscribers, this is where{" "}
          {feature
            ? feature.toLowerCase()
            : "your account, archive, bookmarks, search, and streak"}{" "}
          would live.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap mb-10">
          <Link to="/demo" className="btn-primary">
            See today's brief →
          </Link>
          <Link to="/showcase" className="btn-ghost">
            About this project
          </Link>
        </div>
        <hr className="rule-double mt-12 mb-4" />
        <p className="kicker">
          <Link to="/manifesto" className="text-gold hover:text-paper">
            Manifesto
          </Link>
          <span className="mx-3 text-muted">·</span>
          <Link to="/press" className="text-gold hover:text-paper">
            Press kit
          </Link>
          <span className="mx-3 text-muted">·</span>
          <Link to="/say-hi" className="text-gold hover:text-paper">
            Say hi
          </Link>
        </p>
      </main>
    </>
  );
}
