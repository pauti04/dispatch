export default function ByTheNumbers({ brief }) {
  const totalStories = brief.sections.reduce((n, s) => n + s.stories.length, 0);
  const hnCount = brief.sections.reduce(
    (n, s) => n + s.stories.filter((st) => st.source === "hackernews").length,
    0
  );
  const ghCount = totalStories - hnCount;
  const mostDebated = brief.sections
    .flatMap((s) => s.stories)
    .filter((s) => s.source === "hackernews")
    .sort((a, b) => (b.meta?.comments ?? 0) - (a.meta?.comments ?? 0))[0];

  const items = [
    { n: brief.counts.hn + brief.counts.gh, l: "Stories scanned" },
    { n: totalStories, l: "Selected for you" },
    { n: hnCount, l: "From HackerNews" },
    { n: ghCount, l: "From GitHub" },
    {
      n: mostDebated?.meta?.comments ?? 0,
      l: "Most debated story",
      sub: mostDebated?.title || "—",
    },
  ];

  return (
    <aside className="bt-numbers card">
      <p className="eyebrow mb-4">By the Numbers</p>
      <ul className="space-y-4">
        {items.map((it, i) => (
          <li key={i} className="flex items-baseline gap-4 border-b border-rule pb-3 last:border-0">
            <span className="bt-numbers-n font-display">{it.n}</span>
            <div className="flex-1 min-w-0">
              <p className="kicker mb-0.5">{it.l}</p>
              {it.sub && <p className="font-serif-body text-paper-dim text-xs italic truncate">{it.sub}</p>}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
