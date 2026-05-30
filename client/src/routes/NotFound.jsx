import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";

export default function NotFound() {
  return (
    <>
      <PageMeta
        title="404 · Page not found"
        description="That page has gone to press elsewhere. Back to Dispatch."
      />
      <Masthead subscript="The page has gone to press elsewhere" />
      <main id="main" tabIndex={-1} className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="eyebrow mb-5">404 · Page not found</p>
        <div className="font-display text-[10rem] md:text-[14rem] text-gold leading-none mb-6">
          404
        </div>
        <h2 className="font-display text-3xl md:text-4xl text-paper leading-tight mb-4">
          This page wasn't filed by deadline.
        </h2>
        <p className="font-serif-body text-paper-dim text-lg leading-relaxed max-w-md mx-auto mb-10">
          The masthead doesn't have a record of this URL. Try the front page, or read today's
          brief.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/" className="btn-primary">
            Back to Dispatch
          </Link>
          <Link to="/today" className="btn-ghost">
            Read today's edition
          </Link>
        </div>

        <hr className="rule-double mt-16 mb-6" />
        <p className="kicker">
          If you followed a link to get here, the editor would appreciate{" "}
          <a href="mailto:hi@dispatch.local" className="text-gold">a note</a> about where it broke.
        </p>
      </main>
    </>
  );
}
