import { useEffect, useState } from "react";

/**
 * Thin gold progress bar pinned to the top of the viewport. Reads scroll position
 * vs. document height. Hidden when there isn't enough content to scroll.
 */
export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = (doc.scrollHeight - doc.clientHeight) || 1;
      const pct = Math.max(0, Math.min(1, doc.scrollTop / max));
      setProgress(pct);
      setVisible(max > 200);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="reading-progress no-print" aria-hidden>
      <div className="reading-progress-bar" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
