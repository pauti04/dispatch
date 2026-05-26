import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";
import BriefSkeleton from "../components/BriefSkeleton.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { api } from "../lib/api.js";

const SOURCE_LABELS = {
  hackernews: "HackerNews",
  github_trending: "GitHub",
  lobsters: "Lobsters",
  reddit: "Reddit",
  arxiv: "arXiv",
  show_hn: "Show HN",
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export default function Discover() {
  const [stories, setStories] = useState(null);
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .discoverThisWeek()
      .then((d) => {
        setStories(d.stories || []);
        if (d.note) setNote(d.note);
      })
      .catch((e) => setError(e));
  }, []);

  if (error) return <ErrorState error={error} title="Couldn't load Discover" />;

  return (
    <>
      <PageMeta
        title="Discover"
        description="Top stories saved by Dispatch readers this week. The community discovery layer — anonymized and cached. Updated daily."
      />
      <Masthead subscript="Discover · what readers are saving" />

      <main id="main" className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <p className="eyebrow mb-3">Discover · this week</p>
          <h2 className="font-display text-4xl md:text-5xl text-paper leading-tight mb-3">
            What Dispatch readers are saving.
          </h2>
          <p className="font-serif-body text-paper-dim leading-relaxed max-w-xl mx-auto">
            The stories most-bookmarked by Dispatch subscribers this week. Anonymous —
            shows the story, not who saved it. A second editor, made of clicks.
          </p>
        </div>

        <hr className="rule-gold mb-10" />

        {stories == null && <BriefSkeleton tag="Aggregating this week's saves" lines={3} />}

        {stories && stories.length === 0 && (
          <div className="text-center py-12">
            <p className="font-serif-body italic text-paper-dim text-lg max-w-md mx-auto">
              The community is quiet this week. Be the first — star a story on any edition.
            </p>
          </div>
        )}

        {stories && stories.length > 0 && (
          <ol className="discover-list">
            {stories.slice(0, 10).map((s, i) => (
              <li key={i} className="discover-item">
                <span className="discover-rank">{ROMAN[i] || i + 1}</span>
                <a
                  href={s.story_url}
                  target="_blank"
                  rel="noreferrer"
                  className="discover-link"
                >
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="src-tag">
                      {s.source === "reddit" && s.subreddit
                        ? `r/${s.subreddit}`
                        : SOURCE_LABELS[s.source] || "Source"}
                    </span>
                    <span className="discover-saves">
                      <span className="saves-number">{s.saves}</span> saves
                    </span>
                  </div>
                  <h3 className="discover-title">{s.title}</h3>
                </a>
              </li>
            ))}
          </ol>
        )}

        {note && (
          <p className="text-center kicker mt-12 text-muted">
            {note}
          </p>
        )}

        <hr className="rule-double mt-16 mb-6" />
        <p className="text-center kicker">
          <Link to="/saved" className="text-gold hover:text-paper">
            Save your own stories →
          </Link>
          <span className="mx-3 text-muted">·</span>
          <Link to="/demo" className="text-gold hover:text-paper">
            See today's brief
          </Link>
        </p>
      </main>
    </>
  );
}
