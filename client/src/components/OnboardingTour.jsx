import { useEffect, useState } from "react";

const LS_KEY = "dispatch.tour.done.v1";

const STEPS = [
  {
    title: "Today's lede",
    body: "One sentence summarizing what today means for your field. The hook before you commit to reading.",
  },
  {
    title: "The Editor's Pick",
    body: "One starred story per edition — the single most worth-your-time piece. Bordered in gold so you can't miss it.",
  },
  {
    title: "The Pull Quote",
    body: "A sharp, quotable sentence the editor wants you to remember. Pure editorial drama.",
  },
  {
    title: "Hype tags & community take",
    body: "Each story gets a small label (Heat / Skeptical / Experimental / Deep Dive) and, when HN is talking, a one-line summary of the discussion.",
  },
];

/**
 * Inline overlay coachmark — non-disruptive. Fires once per device.
 * No portal, no DOM measurement: shows as a centered floating card with step text.
 * Anchored visually to the page below so users can still see the brief through the dim.
 */
export default function OnboardingTour({ onDone }) {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(LS_KEY);
    if (!seen) {
      // small delay so the brief has rendered first
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    try {
      localStorage.setItem(LS_KEY, "1");
    } catch {}
    setShow(false);
    onDone?.();
  };

  if (!show) return null;
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="tour-backdrop no-print" onClick={close}>
      <div className="tour-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="kicker">Quick tour · {step + 1} of {STEPS.length}</span>
          <button className="tour-skip" onClick={close} aria-label="Close tour">
            ×
          </button>
        </div>
        <h3 className="font-display text-2xl text-paper mb-2">{s.title}</h3>
        <p className="font-serif-body text-paper-dim leading-relaxed mb-5">{s.body}</p>

        <div className="flex items-center justify-between gap-3">
          <div className="tour-dots">
            {STEPS.map((_, i) => (
              <span key={i} className={`tour-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button className="btn-ghost" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
            {!isLast && (
              <button className="btn-primary" onClick={() => setStep((s) => s + 1)}>
                Next →
              </button>
            )}
            {isLast && (
              <button className="btn-primary" onClick={close}>
                Got it
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
