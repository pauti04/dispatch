/**
 * Wave N+ polish — editorial loading state for brief views.
 * In-character: looks like a paper being typeset, not a row of grey rectangles.
 *
 * Usage:
 *   <BriefSkeleton tag="Composing today's edition" />
 */
export default function BriefSkeleton({ tag = "Composing today's edition", lines = 4 }) {
  return (
    <div className="brief-skeleton" role="status" aria-live="polite" aria-busy="true">
      <p className="brief-skeleton-tag">{tag}…</p>
      <p className="brief-skeleton-headline">
        The editor is reading the wires.
      </p>
      <div style={{ maxWidth: "26rem", margin: "0 auto" }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="brief-skeleton-line"
            style={{ width: `${85 - i * 8}%` }}
          />
        ))}
      </div>
      <span className="sr-only">Loading brief.</span>
    </div>
  );
}
