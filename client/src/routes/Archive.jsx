import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import DemoModeNotice from "../components/DemoModeNotice.jsx";
import { api, IS_STATIC_ONLY } from "../lib/api.js";

export default function Archive() {
  if (IS_STATIC_ONLY) {
    return <DemoModeNotice feature="Your archive" subscript="Archive · demo mode" />;
  }
  const [editions, setEditions] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listEditions()
      .then((d) => setEditions(d.editions))
      .catch((err) => {
        if (err.status === 401) navigate("/login", { replace: true });
        else setError(String(err.message || err));
      });
  }, [navigate]);

  if (error) {
    return (
      <>
        <Masthead subscript="Archive unavailable" />
        <main id="main" tabIndex={-1} className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="font-mono text-sm text-muted break-words">{error}</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Masthead subscript="Back issues" />
      <main id="main" tabIndex={-1} className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <p className="eyebrow mb-3">The archive</p>
          <h2 className="font-display text-4xl md:text-5xl text-paper leading-tight mb-3">
            Every edition we've sent you.
          </h2>
          <p className="font-serif-body text-paper-dim text-lg leading-relaxed max-w-xl mx-auto">
            Browse past editions. Open one to re-read, share, or print.
          </p>
        </div>

        <hr className="rule-gold mb-8" />

        {editions == null && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-5 space-y-2">
                <div className="shimmer h-3 w-24" />
                <div className="shimmer h-6 w-3/4" />
                <div className="shimmer h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {editions && editions.length === 0 && (
          <div className="card p-10 text-center">
            <p className="font-serif-body text-paper-dim italic">
              No editions yet. Your first one arrives at your local send time — check your account.
            </p>
            <Link to="/account" className="btn-ghost mt-6 inline-block">
              Go to account
            </Link>
          </div>
        )}

        {editions && editions.length > 0 && (
          <ul className="space-y-3">
            {editions.map((e) => (
              <li key={e.slug}>
                <Link to={`/edition/${e.slug}`} className="archive-card">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <p className="kicker">{formatDate(e.edition_date)}</p>
                    <p className="story-meta">
                      {e.story_count} {e.story_count === 1 ? "story" : "stories"} · {e.section_count} beats
                    </p>
                  </div>
                  <h3 className="archive-headline">{e.headline || "Untitled edition"}</h3>
                  {e.editor_note && <p className="archive-note">{e.editor_note}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d;
  }
}
