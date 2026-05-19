import { useState } from "react";
import { ROLES, SKILL_LEVELS, DOMAINS, DEPTHS } from "../topics.js";

function normalizeTopic(s) {
  return String(s || "").trim().replace(/\s+/g, " ").slice(0, 48);
}

/**
 * Three-step onboarding for Dispatch · Tech career intelligence.
 *   1. Role (radio)
 *   2. Skill level (radio)
 *   3. Domains + reading depth
 *
 * Submits { role, skill_level, domains, depth }.
 */
export default function OnboardingFlow({ initial, onSubmit, submitLabel = "Print my edition" }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(initial?.role || "software_engineer");
  const [skillLevel, setSkillLevel] = useState(initial?.skill_level || "intermediate");
  const [domains, setDomains] = useState(
    new Set(initial?.domains || ["ML Engineering", "Backend Development"])
  );
  const [excludeTopics, setExcludeTopics] = useState(new Set(initial?.exclude_topics || []));
  const [customInput, setCustomInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [depth, setDepth] = useState(initial?.depth || "standard");

  const toggleDomain = (d) => {
    const next = new Set(domains);
    next.has(d) ? next.delete(d) : next.add(d);
    setDomains(next);
  };

  const addCustomTopic = (e) => {
    e?.preventDefault?.();
    const t = normalizeTopic(customInput);
    if (!t) return;
    const next = new Set(domains);
    next.add(t);
    setDomains(next);
    setCustomInput("");
  };

  const addExclude = (e) => {
    e?.preventDefault?.();
    const t = normalizeTopic(excludeInput);
    if (!t) return;
    const next = new Set(excludeTopics);
    next.add(t);
    setExcludeTopics(next);
    setExcludeInput("");
  };
  const removeExclude = (t) => {
    const next = new Set(excludeTopics);
    next.delete(t);
    setExcludeTopics(next);
  };

  const canStep1 = !!role;
  const canStep2 = !!skillLevel;
  const canSubmit = domains.size > 0 && !!depth;

  const submit = () =>
    onSubmit({
      role,
      skill_level: skillLevel,
      domains: [...domains],
      exclude_topics: [...excludeTopics],
      depth,
    });

  return (
    <div className="onboarding">
      <Steps current={step} />

      {step === 1 && (
        <section>
          <p className="eyebrow text-center mb-3">Step I</p>
          <h2 className="font-display text-3xl md:text-4xl text-paper text-center leading-tight mb-3">
            Who's reading?
          </h2>
          <p className="font-serif-body text-paper-dim text-center max-w-xl mx-auto mb-10">
            Tell us your role so the brief speaks to your career — what to learn, what to ignore,
            what's shifting in your field.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`role-card ${role === r.id ? "active" : ""}`}
              >
                <div className="font-display text-xl text-paper mb-1">{r.label}</div>
                <div className="font-serif-body text-paper-dim text-sm italic">{r.blurb}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-center mt-10">
            <button className="btn-primary" disabled={!canStep1} onClick={() => setStep(2)}>
              Next →
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <p className="eyebrow text-center mb-3">Step II</p>
          <h2 className="font-display text-3xl md:text-4xl text-paper text-center leading-tight mb-3">
            How deep are you in?
          </h2>
          <p className="font-serif-body text-paper-dim text-center max-w-xl mx-auto mb-10">
            We tune the editorial voice and how much background context to include based on your level.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {SKILL_LEVELS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSkillLevel(s.id)}
                className={`role-card ${skillLevel === s.id ? "active" : ""}`}
              >
                <div className="font-display text-xl text-paper mb-1">{s.label}</div>
                <div className="font-serif-body text-paper-dim text-sm italic">{s.blurb}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-3 mt-10">
            <button className="btn-ghost" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button className="btn-primary" disabled={!canStep2} onClick={() => setStep(3)}>
              Next →
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <p className="eyebrow text-center mb-3">Step III</p>
          <h2 className="font-display text-3xl md:text-4xl text-paper text-center leading-tight mb-3">
            What should be on your beat?
          </h2>
          <p className="font-serif-body text-paper-dim text-center max-w-xl mx-auto mb-8">
            Pick the career domains you want intelligence on. You can change these any time.
          </p>

          <div className="mb-3 text-center">
            <p className="kicker">{domains.size} beat{domains.size === 1 ? "" : "s"} selected</p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center max-w-3xl mx-auto mb-4">
            {[...new Set([...DOMAINS, ...domains])].map((d) => (
              <button
                key={d}
                onClick={() => toggleDomain(d)}
                className={`chip ${domains.has(d) ? "active" : ""}`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Custom topic input */}
          <form onSubmit={addCustomTopic} className="flex gap-2 max-w-md mx-auto mb-10">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Add your own beat (e.g. Postgres, RAG, edge computing)"
              className="email-input flex-1"
              maxLength={48}
            />
            <button type="submit" className="btn-ghost" disabled={!customInput.trim()}>
              + Add
            </button>
          </form>

          {/* Exclude topics */}
          <div className="max-w-3xl mx-auto mb-10">
            <details className="exclude-details">
              <summary className="kicker cursor-pointer">Never show me… (optional)</summary>
              <div className="mt-4">
                <form onSubmit={addExclude} className="flex gap-2 max-w-md mb-3">
                  <input
                    type="text"
                    value={excludeInput}
                    onChange={(e) => setExcludeInput(e.target.value)}
                    placeholder="e.g. crypto, blockchain, web3"
                    className="email-input flex-1"
                    maxLength={48}
                  />
                  <button type="submit" className="btn-ghost" disabled={!excludeInput.trim()}>
                    Exclude
                  </button>
                </form>
                {excludeTopics.size > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {[...excludeTopics].map((t) => (
                      <button
                        key={t}
                        onClick={() => removeExclude(t)}
                        className="chip chip-exclude"
                        title="Click to un-exclude"
                      >
                        × {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>

          <div className="max-w-md mx-auto mb-10">
            <p className="eyebrow text-center mb-3">Reading depth</p>
            <div className="depth-strip mx-auto" style={{ display: "flex" }}>
              {DEPTHS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDepth(d.id)}
                  className={depth === d.id ? "active" : ""}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="font-serif-body text-muted text-sm mt-3 italic text-center">
              {DEPTHS.find((d) => d.id === depth)?.blurb}
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <button className="btn-ghost" onClick={() => setStep(2)}>
              ← Back
            </button>
            <button className="btn-primary" disabled={!canSubmit} onClick={submit}>
              {submitLabel}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Steps({ current }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-12">
      {["I", "II", "III"].map((n, i) => {
        const stepNum = i + 1;
        const done = current > stepNum;
        const active = current === stepNum;
        return (
          <div key={n} className="flex items-center gap-3">
            <div className={`step-dot ${active ? "active" : ""} ${done ? "done" : ""}`}>{n}</div>
            {i < 2 && <div className={`step-rule ${done ? "done" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}
