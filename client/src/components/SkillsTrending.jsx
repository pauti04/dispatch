import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export default function SkillsTrending() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .skillsTrending()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setErr(e));
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) return null; // silently hide for anonymous users (401)
  if (!data) return <SkillsTrendingSkeleton />;
  if (!data.skills || data.skills.length === 0) {
    return (
      <aside className="bt-numbers card mt-6">
        <p className="eyebrow mb-3">Skills moving up</p>
        <p className="font-serif-body text-paper-dim text-sm italic">
          Read a few more editions and we'll surface what's rising in your feed.
        </p>
      </aside>
    );
  }

  return (
    <aside className="bt-numbers card mt-6">
      <p className="eyebrow mb-4">Skills moving up this week</p>
      <ul className="space-y-3">
        {data.skills.map((s, i) => (
          <li key={i} className="skill-row">
            <div className="flex items-baseline justify-between gap-3">
              <span className="skill-name font-display">{s.skill}</span>
              <span className="kicker">{s.mentions}×</span>
            </div>
            {s.why && <p className="skill-why">{s.why}</p>}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function SkillsTrendingSkeleton() {
  return (
    <aside className="bt-numbers card mt-6">
      <p className="eyebrow mb-4">Skills moving up this week</p>
      <ul className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <li key={i} className="space-y-2">
            <div className="shimmer h-4 w-1/2" />
            <div className="shimmer h-3 w-full" />
          </li>
        ))}
      </ul>
    </aside>
  );
}
