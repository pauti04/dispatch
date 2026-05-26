import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import DemoModeNotice from "../components/DemoModeNotice.jsx";
import { api, IS_STATIC_ONLY } from "../lib/api.js";

const SOURCE_LABELS = {
  hackernews: "HackerNews",
  github_trending: "GitHub",
  lobsters: "Lobsters",
  reddit: "Reddit",
  arxiv: "arXiv",
  show_hn: "Show HN",
  headline: "Edition headline",
};

export default function Search() {
  if (IS_STATIC_ONLY) {
    return <DemoModeNotice feature="Search across your editions" subscript="Search · demo mode" />;
  }
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [hits, setHits] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Debounce search-on-type
  useEffect(() => {
    const term = params.get("q") || "";
    setQ(term);
    if (!term.trim()) {
      setHits(null);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .search(term)
      .then((d) => setHits(d.hits || []))
      .catch((e) => {
        if (e.status === 401) navigate("/login", { replace: true });
        else setError(String(e.message || e));
      })
      .finally(() => setLoading(false));
  }, [params, navigate]);

  const submit = (e) => {
    e.preventDefault();
    setParams(q ? { q } : {});
  };

  return (
    <>
      <Masthead subscript={q ? `Search · "${q}"` : "Search your editions"} />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <p className="eyebrow mb-3">Search your archive</p>
          <h2 className="font-display text-4xl text-paper leading-tight mb-3">
            Find a story you read on Dispatch.
          </h2>
          <p className="font-serif-body text-paper-dim leading-relaxed max-w-xl mx-auto">
            Searches across your past editions — headlines, summaries, why-it-matters lines, every story title.
          </p>
        </div>

        <form onSubmit={submit} className="max-w-xl mx-auto mb-8 flex gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="vector databases, kubernetes, evaluation tooling…"
            className="email-input flex-1"
            autoFocus
          />
          <button className="btn-primary" type="submit">
            Search
          </button>
        </form>

        {error && <p className="text-center text-red-400 text-sm font-mono">{error}</p>}

        {loading && (
          <div className="space-y-3 max-w-2xl mx-auto">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5 space-y-2">
                <div className="shimmer h-3 w-32" />
                <div className="shimmer h-5 w-3/4" />
              </div>
            ))}
          </div>
        )}

        {hits && hits.length === 0 && !loading && (
          <p className="text-center font-serif-body text-paper-dim italic max-w-md mx-auto">
            No matches yet for <em className="text-paper">"{q}"</em>. Try a broader term, or come back after more editions arrive.
          </p>
        )}

        {hits && hits.length > 0 && (
          <ul className="space-y-3 max-w-2xl mx-auto">
            {hits.map((h, i) => (
              <li key={i} className="search-result">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="src-tag">{SOURCE_LABELS[h.source] || "Source"}</span>
                  <Link to={`/edition/${h.edition_slug}`} className="story-meta hover:text-paper">
                    Edition · {new Date(h.edition_date).toLocaleDateString()}
                  </Link>
                </div>
                {h.url ? (
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-display text-xl md:text-2xl text-paper hover:text-gold leading-snug block"
                  >
                    {h.title}
                  </a>
                ) : (
                  <Link
                    to={`/edition/${h.edition_slug}`}
                    className="font-display text-xl md:text-2xl text-paper hover:text-gold leading-snug block"
                  >
                    {h.title}
                  </Link>
                )}
                {h.tldr && <p className="story-tldr mt-1.5">{h.tldr}</p>}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
