import { useState } from "react";
import { TOPICS } from "../topics.js";

export default function TopicPicker({ initialTopics, initialDepth, onSubmit, submitLabel = "Print today's edition" }) {
  const [selected, setSelected] = useState(new Set(initialTopics || ["AI / LLMs", "Web dev"]));
  const [depth, setDepth] = useState(initialDepth || "standard");

  const toggle = (t) => {
    const next = new Set(selected);
    next.has(t) ? next.delete(t) : next.add(t);
    setSelected(next);
  };

  const canGo = selected.size > 0;
  const submit = () => onSubmit({ topics: [...selected], depth });

  return (
    <div>
      <hr className="rule-gold mb-8" />

      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <p className="eyebrow">Your beats</p>
          <p className="kicker">{selected.size} selected</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={`chip ${selected.has(t) ? "active" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <p className="eyebrow mb-3">Length of read</p>
        <div className="depth-strip">
          {[
            { id: "skim", label: "Skim" },
            { id: "standard", label: "Standard" },
            { id: "deep", label: "Deep" },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDepth(d.id)}
              className={depth === d.id ? "active" : ""}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="font-serif-body text-muted text-sm mt-3 italic">
          {depth === "skim" && "A single line per story. For mornings in a hurry."}
          {depth === "standard" && "A TL;DR and a note on why it matters. The usual."}
          {depth === "deep" && "A short paragraph with the context worth knowing."}
        </p>
      </section>

      <hr className="rule mb-8" />

      <div className="flex items-center justify-center gap-4">
        <button className="btn-primary" disabled={!canGo} onClick={submit}>
          {submitLabel}
        </button>
      </div>
      {!canGo && (
        <p className="text-center text-muted text-sm mt-3 italic">Pick at least one beat.</p>
      )}
    </div>
  );
}
