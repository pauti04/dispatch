import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import DemoModeNotice from "../components/DemoModeNotice.jsx";
import { api, IS_STATIC_ONLY } from "../lib/api.js";

export default function Streak() {
  if (IS_STATIC_ONLY) {
    return <DemoModeNotice feature="Your reading streak" subscript="Streak · demo mode" />;
  }
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api
      .streak()
      .then(setData)
      .catch((e) => {
        if (e.status === 401) navigate("/login", { replace: true });
        else setErr(String(e.message || e));
      });
  }, [navigate]);

  if (err)
    return (
      <>
        <Masthead subscript="Streak unavailable" />
        <main id="main" tabIndex={-1} className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="font-mono text-sm text-muted break-words">{err}</p>
        </main>
      </>
    );

  // Build a 14-day sparkline: each cell on/off based on whether we have an edition for that date
  const dateSet = new Set((data?.dates || []).map((d) => String(d).slice(0, 10)));
  const cells = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    cells.push({ date: d, on: dateSet.has(d) });
  }

  const localStreak = (() => {
    try {
      return JSON.parse(localStorage.getItem("dispatch.streak.v1") || "null");
    } catch {
      return null;
    }
  })();

  return (
    <>
      <Masthead subscript="Your reading streak" leftLine={`Day ${localStreak?.streak ?? 1}`} />
      <main id="main" tabIndex={-1} className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <p className="eyebrow mb-3">Your subscription habit</p>
          <h2 className="font-display text-4xl text-paper leading-tight mb-3">
            Day {localStreak?.streak ?? 1} on Dispatch.
          </h2>
          <p className="font-serif-body text-paper-dim leading-relaxed">
            {data == null
              ? "Loading…"
              : `You've received ${data.edition_count} edition${data.edition_count === 1 ? "" : "s"} so far.`}
          </p>
        </div>

        <hr className="rule-gold mb-6" />

        <p className="eyebrow text-center mb-3">Last two weeks</p>
        <div className="streak-sparkline">
          {cells.map((c) => (
            <div
              key={c.date}
              className={`streak-bar ${c.on ? "on" : ""}`}
              style={{ height: c.on ? "100%" : "20%" }}
              title={c.date + (c.on ? " — edition received" : " — none")}
            />
          ))}
        </div>

        <p className="font-serif-body text-muted text-sm italic text-center mt-6">
          Gold bars are days an edition arrived. Faded bars are weekends or pauses — perfectly fine.
        </p>
      </main>
    </>
  );
}
