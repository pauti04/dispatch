# Voice scoring habit (Days 11-13 + ongoing)

Not a one-shot task. The brief's editorial voice is the product — it has to be maintained continuously. This is how.

---

## The habit

Every workday, generate at least 2-3 real briefs from different roles, read them end-to-end, score each line on three dimensions, and add ONE new BAD/GOOD pair to the prompt per failure mode you spot.

Time per day: ~20 min. Don't skip days.

---

## How to score

For each brief, score 1-5 on:

| Dimension | What "5" looks like | What "1" looks like |
|---|---|---|
| **Coherence** | Reads as one editor's voice across all lines. The lede, editor's note, take, and why-it-matters lines feel written by the same person. | Different sections sound like different ChatGPT prompts. The lede is hyped, the take is hedged, the why-it-matters is generic. |
| **Career-relevance** | Every why-it-matters line names a specific career impact — a skill, a hiring trend, a tool worth learning, a thing worth ignoring. | Lines like "this is increasingly relevant" or "stay ahead of the curve" or "this could enhance your skills." |
| **Voice fidelity** | Concise, slightly observed, mildly opinionated. No marketing words, no LinkedIn-isms, no clichés. The Take commits to something. | Press-release voice. Hedged Take ("there's much to consider"). Banned phrases sneak in. |

Score in a simple text file (`docs/voice-log.md`, gitignored if you want). Format:

```
2026-05-19 — Brief for ML Engineer
  Coherence:        4
  Career-relevance: 3   (the "useful if you work on CLI tools" line is too vague)
  Voice fidelity:   4
  Notes: The Take landed well. Pull quote was generic.
  → Added BAD/GOOD pair for vague why-it-matters lines (see brief.js prompt).
```

---

## When to update the prompt

If a SPECIFIC failure pattern shows up in 2+ different briefs: add a BAD/GOOD pair to `server/brief.js`. Don't add abstract rules — only concrete examples.

Bad prompt change: "Avoid being vague."
Good prompt change:
```
BAD: "This tool could streamline your workflow if you work with CLI utilities."
GOOD: "If you use grep daily, try this once. If not, skip — it's not a new abstraction."
```

The model learns from examples 10x better than from rules.

---

## When to switch prompt variants

You have `prompt_variants` infrastructure (Wave J). Use it.

When you have a hypothesis like "what if we explicitly tell the editor to use one specific opinion phrase per brief?", create variant B with that addition. Let the A/B framework run for 100 briefs. Look at the LLM-judge scores in `brief_scores` joined to `prompt_variants.id`.

The winner replaces the previous default. Don't switch on small sample sizes — wait for 100+ briefs per variant.

---

## What NOT to chase

- **Length.** The brief is 5 minutes to read. Optimizing for longer doesn't help.
- **Cuteness.** Don't try to make the editor "funny." The voice is dry and observed, not jokey.
- **Variety.** The editor has a consistent voice. Resist the urge to make every brief sound different.
- **Source preferences.** Don't fix the prompt to prefer HN over GitHub etc. — the pre-filter handles relevance.

---

## When to STOP iterating

If three consecutive weeks of scoring show all-5s on voice fidelity and you can't spot anything obvious wrong, stop and ship more features instead. Voice is a means, not an end.

---

## Continuous, not a deadline

Days 11-13 of Wave N are buffer + voice scoring; they're not a deadline. After launch, this is a weekly habit. Read 5 briefs every Friday. Score. Update the prompt if you spotted something. Repeat.

The compounding curve: by month 6 your prompt has 30 BAD/GOOD pairs accumulated from real failure modes. The voice gets sharper than any competitor can match in a weekend clone — because it's grounded in specific failures you observed.
