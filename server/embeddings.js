// Embeddings-based pre-filter. Before sending the whole cluster pool to GPT, embed the user's
// beats + each cluster's primary title, cosine-rank, and keep only the top N most-relevant
// clusters. Cuts token cost ~70-80% with negligible quality loss at scale.

import OpenAI from "openai";
import dotenv from "dotenv";
import { logUsage } from "./usage.js";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "missing-at-runtime" });
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";

// In-memory LRU caches so we don't re-embed the same beats / titles within a run or across
// briefs for the same user. Keys are normalized text. Values: { vec: number[], at: number }.
const beatCache = new Map();
const titleCache = new Map();
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE = 2000;

function evictIfNeeded(cache) {
  if (cache.size <= MAX_CACHE) return;
  const cutoff = Date.now() - TTL_MS;
  for (const [k, v] of cache) {
    if (v.at < cutoff) cache.delete(k);
    if (cache.size <= MAX_CACHE * 0.8) break;
  }
  // Hard cap: drop oldest if still over
  while (cache.size > MAX_CACHE) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0]?.[0];
    if (!oldest) break;
    cache.delete(oldest);
  }
}

function norm(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

/**
 * Embed a batch of strings, using both caches. Splits cached vs. uncached, only calls the API
 * for the latter. Returns array aligned to input.
 */
async function embedBatch(strings, cache) {
  const results = new Array(strings.length);
  const toFetch = [];
  const toFetchIdx = [];

  for (let i = 0; i < strings.length; i++) {
    const key = norm(strings[i]);
    if (!key) {
      results[i] = null;
      continue;
    }
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) {
      results[i] = hit.vec;
      hit.at = Date.now(); // bump for LRU
    } else {
      toFetch.push(key);
      toFetchIdx.push(i);
    }
  }

  if (toFetch.length) {
    const { callOpenAIWithRetry } = await import("./openai-utils.js");
    const resp = await callOpenAIWithRetry(
      () =>
        openai.embeddings.create({
          model: EMBED_MODEL,
          input: toFetch,
        }),
      { timeoutMs: 15_000, endpoint: "embed" }
    );
    logUsage({
      endpoint: "embed",
      model: EMBED_MODEL,
      prompt_tokens: resp.usage?.prompt_tokens,
      completion_tokens: 0,
      total_tokens: resp.usage?.total_tokens,
    });
    const vecs = resp.data.map((d) => d.embedding);
    for (let j = 0; j < toFetch.length; j++) {
      cache.set(toFetch[j], { vec: vecs[j], at: Date.now() });
      results[toFetchIdx[j]] = vecs[j];
    }
    evictIfNeeded(cache);
  }
  return results;
}

/**
 * Pre-filter clusters by embedding-similarity to the user's beats.
 * Returns a sorted subset of clusters (highest similarity first), length <= topN.
 * On any failure, returns the full clusters array unchanged (graceful degrade).
 */
export async function prefilterPoolByBeats({ clusters, role, skillLevel, domains, topN = 30 }) {
  try {
    if (!Array.isArray(domains) || !domains.length) return clusters;
    if (!Array.isArray(clusters) || clusters.length <= topN) return clusters;

    // Build a single "user profile" string + embed each beat individually so we can score each
    // cluster against the max beat similarity (better than averaging — preserves multi-beat readers)
    const beatStrings = domains.map((d) => `Career beat: ${d}${role ? ` for a ${role}` : ""}${skillLevel ? ` at ${skillLevel} level` : ""}`);

    const titleStrings = clusters.map((c) => {
      const item = c.primary.item;
      const parts = [item.title || "", item.description || "", (item.tags || []).join(" ")];
      return parts.filter(Boolean).join(" — ").slice(0, 400);
    });

    const [beatVecs, titleVecs] = await Promise.all([
      embedBatch(beatStrings, beatCache),
      embedBatch(titleStrings, titleCache),
    ]);

    // Score each cluster by max similarity to any beat
    const scored = clusters.map((c, i) => {
      const tv = titleVecs[i];
      if (!tv) return { c, score: 0 };
      let best = 0;
      for (const bv of beatVecs) {
        if (!bv) continue;
        const s = cosine(tv, bv);
        if (s > best) best = s;
      }
      return { c, score: best };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN).map((x) => x.c);
  } catch (err) {
    console.warn("embeddings prefilter failed (graceful, using full pool):", err.message);
    return clusters;
  }
}
