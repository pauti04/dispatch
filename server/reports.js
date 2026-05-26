// Long-form "Dispatch Reports" — synthesize a week's editions into a deeper piece.

import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "missing-at-runtime" });
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function slugify(s) {
  return String(s || "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Generate a Dispatch Report from a set of editions (typically the past week's worth).
 * Returns the persisted report shape (caller should `insertReport`).
 */
export async function synthesizeReport({ editions, topic }) {
  if (!editions?.length) throw new Error("no editions to synthesize");

  const corpus = editions
    .map((e) => {
      const stories = (e.data?.sections || [])
        .flatMap((s) => s.stories || [])
        .slice(0, 8)
        .map((st) => `    - [${st.source}] ${st.title}${st.tldr ? `: ${st.tldr.slice(0, 200)}` : ""}`)
        .join("\n");
      return `Edition ${e.edition_date}: "${e.data?.headline || ""}"\n${stories}`;
    })
    .join("\n\n");

  const topicLine = topic
    ? `Focus the report around the theme: "${topic}". Other strands can appear, but this is the spine.`
    : "Choose the strongest emergent theme from the corpus and make IT the spine of the report.";

  const prompt = `You are the editor of "Dispatch" writing a long-form Dispatch Report — an occasional deeper piece that synthesizes a week of daily editions into one careful, voiceful read.

Voice: thoughtful, observant, slightly old-school newspaper editor. Concise sentences, no marketing, no emojis, no exclamation marks. Career-grounded — treat the reader as a working developer who values context over hype.

${topicLine}

Structure: 700-1200 words of plain prose (no markdown headers, no bullet lists, no formatting tricks). 4-7 paragraphs. Open with a sharp lede paragraph. Close with a paragraph about what to do about it — skills, questions, what to watch next month.

Output ONLY valid JSON:
{
  "title": "5-9 word title — declarative, not clickbait",
  "subtitle": "one sentence (≤22 words) framing the piece",
  "body": "the full report as plain prose, paragraphs separated by \\n\\n",
  "pull_quote": "one sharp quotable sentence from the body (≤18 words)",
  "topic": "one or two words tagging the dominant theme"
}

CORPUS — past week's daily editions:

${corpus}`;

  const resp = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.45,
    response_format: { type: "json_object" },
    max_tokens: 2200,
  });

  const raw = resp.choices?.[0]?.message?.content || "";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("model returned non-JSON");
    parsed = JSON.parse(m[0]);
  }

  return {
    slug: slugify(parsed.title || "dispatch-report") + "-" + Math.random().toString(36).slice(2, 8),
    title: parsed.title || "Dispatch Report",
    subtitle: parsed.subtitle || "",
    body: parsed.body || "",
    pullQuote: parsed.pull_quote || "",
    topic: parsed.topic || topic || "tech",
  };
}
