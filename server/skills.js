import OpenAI from "openai";
import dotenv from "dotenv";
import { listRecentEditionsForUser } from "./db.js";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openai = new OpenAI({ apiKey: OPENAI_API_KEY || "missing-at-runtime" });

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map(); // userId -> { at, value }

/**
 * Extract the top 5 rising skill keywords from a user's past-week editions.
 * Returns [{ skill, mentions, why }] — 0-5 items.
 */
export async function getTrendingSkillsForUser(userId) {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const recent = await listRecentEditionsForUser(userId, 7).catch(() => []);
  if (recent.length < 2) {
    const empty = { skills: [], generated_at: new Date().toISOString(), edition_count: recent.length };
    cache.set(userId, { at: Date.now(), value: empty });
    return empty;
  }

  const titles = recent
    .flatMap((e) => (e.data?.sections || []).flatMap((s) => s.stories || []))
    .map((st) => `- ${st.title}${st.tldr ? `: ${st.tldr.slice(0, 200)}` : ""}`)
    .join("\n")
    .slice(0, 5000);

  const prompt = `Below are the story headlines + TL;DRs from the reader's last 7 daily Dispatch editions.

Identify the **5 specific skills, tools, or technical concepts** that appear most worth investing time in this week — based on frequency, signal strength, and how often they came up. Skills can be concrete (a library, framework, tool, technique) or conceptual (an emerging practice, abstraction, ecosystem move).

For each, write:
- skill: 1-3 word name
- mentions: rough integer count of how prominently it featured
- why: one short sentence (≤15 words) on why it's worth learning right now

Return JSON only, no markdown:
{ "skills": [ { "skill": "RAG", "mentions": 4, "why": "Half this week's AI stories assume you know it" } ] }

If fewer than 5 distinct rising skills clearly emerge, return fewer. If nothing rises above noise, return an empty list.

STORIES:
${titles}`;

  const resp = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const raw = resp.choices?.[0]?.message?.content || "";
  let parsed = { skills: [] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch {}
    }
  }
  const value = {
    skills: (parsed.skills || []).slice(0, 5),
    generated_at: new Date().toISOString(),
    edition_count: recent.length,
  };
  cache.set(userId, { at: Date.now(), value });
  return value;
}
