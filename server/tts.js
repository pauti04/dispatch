import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE || "alloy";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || "missing-at-runtime" });

/**
 * Compose the script the narrator reads. Editorial voice — same brand as the brief itself.
 * Keeps it brief: lede, editor's note, editor's pick, pull quote, then a quick walk through sections.
 */
function composeScript(brief) {
  const parts = [];
  parts.push(`Dispatch · Tech — today's brief.`);
  if (brief.headline) parts.push(brief.headline + ".");
  if (brief.editor_note) {
    parts.push("From the editor: " + brief.editor_note);
  }

  const sections = brief.sections || [];
  const pick = brief.editor_pick
    ? sections.flatMap((s) => s.stories || []).find((st) => st.ref === brief.editor_pick)
    : null;

  if (pick) {
    parts.push(`Today's Editor's Pick: ${pick.title}.`);
    if (pick.tldr) parts.push(pick.tldr);
    if (pick.why_it_matters) parts.push("Why it matters — " + pick.why_it_matters);
  }

  for (const sec of sections) {
    const others = (sec.stories || []).filter((st) => st.ref !== brief.editor_pick);
    if (!others.length) continue;
    parts.push(`In ${sec.topic}.`);
    for (const st of others) {
      parts.push(st.title + ".");
      if (st.tldr) parts.push(st.tldr);
      if (st.why_it_matters) parts.push("Why it matters: " + st.why_it_matters);
    }
  }

  if (brief.pull_quote) parts.push(`Quote of the day: "${brief.pull_quote}".`);
  parts.push("That's your edition. Have a thoughtful morning.");
  return parts.join(" ");
}

/**
 * Synthesize a brief to MP3. Returns { buffer, durationS } (durationS is a rough estimate).
 */
export async function synthesizeBriefAudio(brief) {
  const script = composeScript(brief);
  // ~150 words/min for narration; rough estimate.
  const words = script.split(/\s+/).length;
  const durationS = Math.round((words / 150) * 60);

  const { callOpenAIWithRetry } = await import("./openai-utils.js");
  const resp = await callOpenAIWithRetry(
    () =>
      openai.audio.speech.create({
        model: TTS_MODEL,
        voice: TTS_VOICE,
        input: script,
        response_format: "mp3",
      }),
    { timeoutMs: 30_000, endpoint: "tts" }
  );

  const arr = await resp.arrayBuffer();
  return { buffer: Buffer.from(arr), durationS };
}
