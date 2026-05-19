import { api } from "../lib/api.js";

const HYPE_LABELS = {
  hyped: { label: "Heat", className: "hype-hyped" },
  skeptical: { label: "Skeptical", className: "hype-skeptical" },
  experimental: { label: "Experimental", className: "hype-experimental" },
  deep_dive: { label: "Deep Dive", className: "hype-deep" },
};

const SOURCE_LABELS = {
  hackernews: "HackerNews",
  github_trending: "GitHub",
  lobsters: "Lobsters",
  reddit: "Reddit",
};

const SOURCE_TAG_CLASS = {
  hackernews: "hn",
  github_trending: "gh",
  lobsters: "lo",
  reddit: "rd",
};

export default function Story({ story, lead = false, isPick = false, isBookmarked, onBookmark, editionSlug }) {
  const sourceLabel = SOURCE_LABELS[story.source] || "Source";
  const tagClass = SOURCE_TAG_CLASS[story.source] || "";
  const hype = story.hype ? HYPE_LABELS[story.hype] : null;
  const showBookmark = typeof onBookmark === "function";

  const onStarClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark?.(story);
  };

  const onLinkClick = () => {
    // Fire click beacon (silent, keepalive — won't delay navigation). Only when authed; the
    // backend gates on auth and silently ignores otherwise. The bookmark-toggle UI also requires
    // auth, so `onBookmark` being a function is a proxy for "authed".
    if (showBookmark) {
      api.trackClick({
        edition_slug: editionSlug,
        story_url: story.url,
        story_source: story.source,
        story_title: story.title,
      });
    }
  };

  return (
    <a
      href={story.url}
      target="_blank"
      rel="noreferrer"
      className={`editorial story block group ${story.predicted_click ? "predicted-click" : ""}`}
      onClick={onLinkClick}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`src-tag ${tagClass}`}>{sourceLabel}</span>
        {isPick && <span className="src-tag pick">★ Editor's Pick</span>}
        {hype && <span className={`hype-tag ${hype.className}`}>{hype.label}</span>}
        {story.predicted_click && (
          <span className="predicted-dot" title="Looks like one of your reads">
            ●
          </span>
        )}
        <span className="story-meta">{renderMeta(story)}</span>
        {showBookmark && (
          <button
            onClick={onStarClick}
            className={`bookmark-btn no-print ${isBookmarked ? "saved" : ""}`}
            aria-label={isBookmarked ? "Remove bookmark" : "Save story"}
            title={isBookmarked ? "Remove bookmark" : "Save story"}
          >
            {isBookmarked ? "★" : "☆"}
          </button>
        )}
      </div>

      <h3
        className={`story-title ${
          isPick || lead ? "text-3xl md:text-4xl mb-3" : "text-xl md:text-2xl mb-2"
        }`}
      >
        {story.title}
      </h3>

      {story.tldr && <p className="story-tldr mb-2">{story.tldr}</p>}
      {story.why_it_matters && <p className="story-why">— {story.why_it_matters}</p>}

      {isPick && story.deep_dive && (
        <div className="deep-dive">
          <p className="kicker mb-2">The editor goes deeper</p>
          <p className="deep-dive-text">{story.deep_dive}</p>
        </div>
      )}

      {story.community_take && (
        <p className="community-take">
          <span className="community-take-label">Community take</span> {story.community_take}
        </p>
      )}

      {story.alt_sources?.length > 0 && (
        <div className="alt-sources" onClick={(e) => e.stopPropagation()}>
          <span className="kicker">Also on</span>{" "}
          {story.alt_sources.map((alt, i) => (
            <a
              key={i}
              href={alt.url}
              target="_blank"
              rel="noreferrer"
              className="alt-source-link"
              onClick={(e) => e.stopPropagation()}
            >
              {alt.label}
              {typeof alt.comments === "number" ? ` (${alt.comments})` : ""}
            </a>
          ))}
        </div>
      )}
    </a>
  );
}

function renderMeta(story) {
  const m = story.meta || {};
  switch (story.source) {
    case "hackernews":
      return (
        <>
          ▲ {m.score ?? 0} · {m.comments ?? 0} comments
        </>
      );
    case "github_trending":
      return (
        <>
          {m.language || "Repo"} · +{m.stars_today ?? 0} stars today
        </>
      );
    case "lobsters":
      return (
        <>
          ▲ {m.score ?? 0} · {m.comments ?? 0} comments
        </>
      );
    case "reddit":
      return (
        <>
          r/{m.subreddit} · {m.score ?? 0} upvotes · {m.comments ?? 0} comments
        </>
      );
    default:
      return null;
  }
}
