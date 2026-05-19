import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import { api } from "../lib/api.js";

const SOURCE_LABELS = {
  hackernews: "HackerNews",
  github_trending: "GitHub",
  lobsters: "Lobsters",
  reddit: "Reddit",
  arxiv: "arXiv",
  show_hn: "Show HN",
};

export default function Discover() {
  const [stories, setStories] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .discoverThisWeek()
      .then((d) => setStories(d.stories || []))
      .catch((e) => setError(String(e.message || e)));
  }, []);

  return (
    <>
      <Masthead subscript="Discover · what readers are saving" />

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <p className="eyebrow mb-3">Discover · this week</p>
          <h2 className="font-display text-4xl md:text-5xl text-paper leading-tight mb-3">
            What Dispatch readers are saving.
          </h2>
          <p className="font-serif-body text-paper-dim leading-relaxed max-w-xl mx-auto">
            The stories most-bookmarked by Dispatch subscribers in the past 7 days. Anonymous —
            shows the story, not who saved it.
          </p>
        </div>

        <hr className="rule-gold mb-8" />

        {error && (
          <p className="text-center font-mono text-sm text-muted">{error}</p>
        )}

        {stories == null && !error && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-5 space-y-2">
                <div className="shimmer h-3 w-24" />
                <div className="shimmer h-5 w-3/4" />
              </div>
            ))}
          </div>
        )}

        {stories && stories.length === 0 && (
          <div className="card p-8 text-center">
            <p className="font-serif-body text-paper-dim italic">
              The community is quiet this week. Be the first — star a story on any edition.
            </p>
          </div>
        )}

        {stories && stories.length > 0 && (
          <ul className="space-y-3">
            {stories.map((s, i) => (
              <li key={i}>
                <a href={s.story_url} target="_blank" rel="noreferrer" className="discover-card">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="src-tag">{SOURCE_LABELS[s.source] || "Source"}</span>
                    <span className="discover-saves">{s.saves} saves</span>
                  </div>
                  <h3 className="font-display text-xl md:text-2xl text-paper hover:text-gold leading-snug">
                    {s.title}
                  </h3>
                </a>
              </li>
            ))}
          </ul>
        )}

        <p className="text-center mt-12">
          <Link to="/saved" className="kicker">
            Save your own stories →
          </Link>
        </p>
      </main>
    </>
  );
}
