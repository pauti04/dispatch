// LLM-as-judge brief quality scoring. Runs async after generation; never blocks the user-facing
// response. Scores three axes 1-5 and stores in `brief_scores`.

import OpenAI from "openai";
import dotenv from "dotenv";
import { sql } from "./db.js";
import { logUsage } from "./usage.js";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const JUDGE_MODEL = process.env.OPENAI_JUDGE_MODEL || "gpt-4o-mini";

const PROMPT = `You are a strict editor reviewing a draft of the Dispatch · Tech daily brief — a career-intelligence brief for working developers. The brief should be:

1. **Coherent** — sections + stories hang together. The headline reflects the day's theme. Editor's note ties things up. No filler.
2. **Career-relevant** — every "why_it_matters" line connects to skill demand, hiring trends, or what's worth learning. Not generic news framing.
3. **Voice-faithful** — wry, observed, slightly old-school newspaper editor. NO marketing language. NO emojis. NO breathless takes. NO exclamation marks.

Score each axis 1-5 (1 = poor, 5 = excellent). Optionally add a ≤2-sentence note flagging the single most fixable issue.

Output ONLY valid JSON, no markdown:
{
  "coherence": 4,
  "career_relevance": 5,
  "voice_fidelity": 3,
  "notes": "one short observation about the weakest axis"
}

THE BRIEF:

`;

/**
 * Score a brief async. Returns null on any failure — never throws.
 * Writes a row to brief_scores when DB is reachable.
 */
export async function scoreBriefAsync({ brief, editionSlug, requestId, variantId }) {
  try {
    const summary = compactBriefForJudge(brief);
    const { callOpenAIWithRetry } = await import("./openai-utils.js");
    const resp = await callOpenAIWithRetry(
      () =>
        openai.chat.completions.create({
          model: JUDGE_MODEL,
          messages: [{ role: "user", content: PROMPT + summary }],
          temperature: 0.2,
          response_format: { type: "json_object" },
          max_tokens: 400,
        }),
      { timeoutMs: 15_000, endpoint: "judge" }
    );
    logUsage({
      endpoint: "judge",
      model: JUDGE_MODEL,
      prompt_tokens: resp.usage?.prompt_tokens,
      completion_tokens: resp.usage?.completion_tokens,
      total_tokens: resp.usage?.total_tokens,
    });
    const raw = resp.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return null;
      parsed = JSON.parse(m[0]);
    }
    const score = {
      coherence: clampScore(parsed.coherence),
      career_relevance: clampScore(parsed.career_relevance),
      voice_fidelity: clampScore(parsed.voice_fidelity),
      notes: String(parsed.notes || "").slice(0, 400) || null,
    };
    if ([score.coherence, score.career_relevance, score.voice_fidelity].every((v) => v == null)) {
      return null;
    }
    try {
      await sql`
        insert into brief_scores
          (edition_slug, request_id, variant_id, coherence, career_relevance, voice_fidelity, notes)
        values
          (${editionSlug || null}, ${requestId || null}, ${variantId || null},
           ${score.coherence}, ${score.career_relevance}, ${score.voice_fidelity}, ${score.notes})
      `;
    } catch (dbErr) {
      console.warn("brief score db write failed (non-fatal):", dbErr.message);
    }
    return score;
  } catch (err) {
    console.warn("brief score generation failed (non-fatal):", err.message);
    return null;
  }
}

function clampScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function compactBriefForJudge(brief) {
  const parts = [];
  parts.push(`Headline: ${brief.headline || "(none)"}`);
  if (brief.editor_note) parts.push(`Editor's note: ${brief.editor_note}`);
  if (brief.pull_quote) parts.push(`Pull quote: "${brief.pull_quote}"`);
  if (brief.featured_comment?.text) {
    parts.push(`From the comments [${brief.featured_comment.author || "anon"}]: "${brief.featured_comment.text}"`);
  }
  for (const sec of brief.sections || []) {
    parts.push("");
    parts.push(`[${sec.topic}]`);
    for (const st of (sec.stories || []).slice(0, 5)) {
      parts.push(`- ${st.title}`);
      if (st.tldr) parts.push(`  ${st.tldr}`);
      if (st.why_it_matters) parts.push(`  why_it_matters: ${st.why_it_matters}`);
    }
  }
  return parts.join("\n").slice(0, 4000);
}
