import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import OnboardingFlow from "../components/OnboardingFlow.jsx";
import OnboardingTour from "../components/OnboardingTour.jsx";
import BriefView from "../components/BriefView.jsx";
import DemoModeNotice from "../components/DemoModeNotice.jsx";
import { api, IS_STATIC_ONLY } from "../lib/api.js";
import { track, events } from "../lib/analytics.js";
import { roleLabel, skillLabel } from "../topics.js";

const LS_KEY = "dispatch.prefs.v2";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function savePrefs(p) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {}
}

function LiveComposing({ text }) {
  // Show only the last ~600 chars of streaming text, in a tasteful editorial pane
  const tail = text.length > 600 ? "…" + text.slice(-600) : text;
  return (
    <>
      <Masthead subscript="The press is composing your edition…" />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <p className="eyebrow mb-3">Live · composing</p>
          <h2 className="font-display text-3xl md:text-4xl text-paper leading-tight mb-3">
            The editor is reading the wires.
          </h2>
          <p className="font-serif-body text-paper-dim italic">
            Fetching HN, GitHub, Lobsters, Reddit, arXiv, Show HN, hiring signal — then writing.
          </p>
        </div>
        <div className="live-composing-pane">
          <div className="kicker text-center mb-3">Editor's draft, as it's written</div>
          <pre className="live-composing-text">{tail || "Reading sources…"}</pre>
          <div className="live-cursor" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
    </>
  );
}

export default function Try() {
  if (IS_STATIC_ONLY) {
    return (
      <DemoModeNotice
        feature="Composing a fresh brief on the fly"
        subscript="Try · demo mode"
      />
    );
  }
  const initial = loadPrefs();
  const [prefs, setPrefs] = useState(null);
  const [brief, setBrief] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => () => abortRef.current?.(), []);

  const generate = (p) => {
    setError(null);
    setPrefs(p);
    savePrefs(p);
    setStreamText("");
    setStreaming(true);

    abortRef.current = api.streamBrief(
      { role: p.role, skill_level: p.skill_level, domains: p.domains, depth: p.depth },
      {
        onDelta: (chunk) => setStreamText((t) => t + chunk),
        onComplete: (data) => {
          setBrief(data);
          setStreaming(false);
          track(events.BRIEF_GENERATED, {
            role: p.role,
            skill_level: p.skill_level,
            depth: p.depth,
            domains_count: (p.domains || []).length,
            sections_count: data.sections?.length || 0,
            stories_count: (data.sections || []).reduce((n, s) => n + s.stories.length, 0),
          });
        },
        onError: (err) => {
          setError(String(err.message || err));
          setStreaming(false);
        },
      }
    );
  };

  const goToSignup = () => {
    if (prefs) savePrefs(prefs);
    navigate("/signup");
  };

  if (streaming && !brief) return <LiveComposing text={streamText} />;

  if (error) {
    return (
      <>
        <Masthead subscript="The press has jammed" />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="eyebrow mb-4">A problem at the press</p>
          <h2 className="font-display text-3xl text-paper mb-4">We couldn't compose the preview.</h2>
          <p className="font-mono text-sm text-muted break-words mb-8">{error}</p>
          <button className="btn-primary" onClick={() => setError(null)}>
            Try again
          </button>
        </main>
      </>
    );
  }

  if (!brief) {
    return (
      <>
        <Masthead subscript="Build your edition · no signup needed" />
        <main className="max-w-4xl mx-auto px-6 py-12">
          <OnboardingFlow
            initial={initial}
            onSubmit={generate}
            submitLabel="Show me today's brief →"
          />
        </main>
      </>
    );
  }

  return (
    <>
      <Masthead subscript="Preview · fresh from the wire" />

      <div className="cta-strip no-print">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <p className="font-serif-body italic text-paper-dim text-sm">
            Like this? Get one every weekday morning, tuned to your role.
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setBrief(null)}>
              Adjust beats
            </button>
            <button className="btn-primary" onClick={goToSignup}>
              Get this every morning →
            </button>
          </div>
        </div>
      </div>

      <BriefView
        brief={brief}
        prefs={prefs}
        header={
          prefs && (
            <p className="text-center font-serif-body text-paper-dim italic">
              Tuned for a <strong className="not-italic text-paper">{roleLabel(prefs.role)}</strong>{" "}
              at the <strong className="not-italic text-paper">{skillLabel(prefs.skill_level)}</strong>{" "}
              level.
            </p>
          )
        }
      />

      <OnboardingTour />
    </>
  );
}
