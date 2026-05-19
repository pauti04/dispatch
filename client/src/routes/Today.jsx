import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import BriefView from "../components/BriefView.jsx";
import Shimmer from "../components/Shimmer.jsx";
import { api } from "../lib/api.js";

export default function Today() {
  const [brief, setBrief] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api
      .sample()
      .then(setBrief)
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  if (err) {
    return (
      <>
        <Masthead subscript="Today's preview unavailable" />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="font-mono text-sm text-muted break-words">{err}</p>
        </main>
      </>
    );
  }

  if (!brief) return <Shimmer subscript="Composing today's public preview…" />;

  return (
    <>
      <Masthead subscript="Today on Dispatch · public preview" />

      <div className="cta-strip no-print">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <p className="font-serif-body italic text-paper-dim text-sm">
            This is the default sample. Your own edition is tuned to your role, skill level, and beats.
          </p>
          <div className="flex gap-2">
            <Link to="/try" className="btn-ghost">
              Build my edition
            </Link>
            <Link to="/signup" className="btn-primary">
              Subscribe
            </Link>
          </div>
        </div>
      </div>

      <BriefView brief={brief} prefs={{ depth: brief.depth || "standard" }} />
    </>
  );
}
