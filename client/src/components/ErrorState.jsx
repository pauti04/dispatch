import { Link } from "react-router-dom";
import Masthead from "./Masthead.jsx";

/**
 * Wave N+ polish — unified editorial-styled error state.
 * Replaces the ad-hoc "couldn't load" lines scattered across routes.
 *
 * Usage:
 *   <ErrorState error={err} title="The press has jammed" subtitle="..." />
 */
export default function ErrorState({
  error,
  title = "Something didn't print right.",
  subtitle = "The masthead couldn't pull this page together.",
  retry,
  retryLabel = "Try again",
  showBackHome = true,
}) {
  const msg = String(error?.message || error || "");
  return (
    <>
      <Masthead subscript="A problem at the press" />
      <main className="max-w-xl mx-auto px-6 py-16 text-center" role="alert">
        <p className="eyebrow mb-4">A problem at the press</p>
        <h2 className="font-display text-3xl md:text-4xl text-paper leading-tight mb-4">
          {title}
        </h2>
        <p className="font-serif-body text-paper-dim leading-relaxed mb-8">
          {subtitle}
        </p>
        {msg && (
          <details className="text-left mb-8 mx-auto max-w-md">
            <summary className="kicker cursor-pointer mb-2">Technical details</summary>
            <p className="font-mono text-xs text-muted break-words bg-paper-fade p-3 rounded-sm">
              {msg}
            </p>
          </details>
        )}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {retry && (
            <button className="btn-primary" onClick={retry}>
              {retryLabel}
            </button>
          )}
          {showBackHome && (
            <Link to="/" className="btn-ghost">
              Back to Dispatch
            </Link>
          )}
        </div>
        <hr className="rule-double mt-12 mb-4" />
        <p className="kicker">
          If this keeps happening, the editor would appreciate{" "}
          <Link to="/say-hi" className="text-gold hover:text-paper">a note</Link>.
        </p>
      </main>
    </>
  );
}
