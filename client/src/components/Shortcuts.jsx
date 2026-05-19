import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Global keyboard shortcuts. Mounted once at the App level.
 *
 *   /        focus search (navigates to /search and focuses the input via autofocus)
 *   ?        toggle the help overlay
 *   esc      close help overlay
 *   g then h home
 *   g then t today's edition
 *   g then a account
 *   g then s saved
 *   g then d discover
 *   g then r referrals
 *
 * Skips when an input is focused (so typing into a field doesn't trigger nav).
 */
const NAV = {
  h: "/",
  t: "/today",
  a: "/account",
  s: "/saved",
  d: "/demo",
  r: "/referrals",
  k: "/search", // alternative to "/"
  m: "/manifesto",
};

const SHORTCUTS = [
  { keys: "/", desc: "Focus search" },
  { keys: "?", desc: "Open this cheat sheet" },
  { keys: "g h", desc: "Home" },
  { keys: "g d", desc: "Annotated demo" },
  { keys: "g t", desc: "Today's edition" },
  { keys: "g a", desc: "Account" },
  { keys: "g s", desc: "Saved stories" },
  { keys: "g m", desc: "Manifesto" },
  { keys: "esc", desc: "Close overlay" },
];

export default function Shortcuts() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [pending, setPending] = useState(null); // last "g" press timestamp

  useEffect(() => {
    const inInput = (e) => {
      const t = e.target;
      if (!t) return false;
      const tag = (t.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || t.isContentEditable;
    };

    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (inInput(e)) {
        if (e.key === "Escape") {
          e.target.blur();
        }
        return;
      }

      if (e.key === "Escape") {
        setHelpOpen(false);
        setPending(null);
        return;
      }

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        navigate("/search");
        return;
      }

      if (e.key === "g") {
        setPending(Date.now());
        // expire pending after 1.2s
        setTimeout(() => setPending((p) => (Date.now() - (p || 0) > 1100 ? null : p)), 1200);
        return;
      }

      if (pending && Date.now() - pending < 1200 && NAV[e.key]) {
        e.preventDefault();
        setPending(null);
        navigate(NAV[e.key]);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, pending]);

  if (!helpOpen) return null;
  return (
    <div className="shortcuts-backdrop no-print" onClick={() => setHelpOpen(false)}>
      <div className="shortcuts-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="eyebrow">Keyboard shortcuts</p>
          <button onClick={() => setHelpOpen(false)} className="shortcuts-close" aria-label="Close">
            ×
          </button>
        </div>
        <h3 className="font-display text-2xl text-paper mb-5">Move through Dispatch fast.</h3>
        <ul className="shortcuts-list">
          {SHORTCUTS.map((s, i) => (
            <li key={i}>
              <kbd>{s.keys}</kbd>
              <span>{s.desc}</span>
            </li>
          ))}
        </ul>
        <p className="kicker mt-6">Press <kbd>?</kbd> again to close.</p>
      </div>
    </div>
  );
}
