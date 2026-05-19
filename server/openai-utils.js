// Wave N Day 3 — OpenAI call hardening.
//
// Two helpers:
//   withTimeout(promise, ms)  — race the promise against a timeout; rejects with TimeoutError
//   callOpenAIWithRetry(fn)   — wraps a non-streaming OpenAI call with timeout + 1 retry on transient errors
//
// Streaming calls use AbortController directly (see brief.js generateBriefStream) — retries
// mid-stream would corrupt the SSE protocol so we DO NOT retry there. Just fail cleanly.

import { captureError } from "./observability.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 250;
const STREAM_CEILING_MS = 60_000;

export class TimeoutError extends Error {
  constructor(ms) {
    super(`OpenAI call timed out after ${ms}ms`);
    this.name = "TimeoutError";
    this.transient = true;
  }
}

export function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isTransient(err) {
  if (!err) return false;
  if (err instanceof TimeoutError) return true;
  const status = err.status || err.code;
  if (status === "ECONNRESET" || status === "ETIMEDOUT" || status === "ENETDOWN") return true;
  // OpenAI SDK errors expose `.status` for HTTP code
  if (typeof status === "number" && status >= 500 && status < 600) return true;
  if (typeof status === "number" && status === 429) return true; // brief backoff helps with rate limits too
  return false;
}

/**
 * Wrap a function that returns an OpenAI call promise. Adds timeout + a single retry on transient errors.
 *
 * Usage:
 *   const resp = await callOpenAIWithRetry(
 *     () => openai.chat.completions.create({ ... }),
 *     { timeoutMs: 15000, endpoint: "deep_dive" }
 *   );
 */
export async function callOpenAIWithRetry(fn, { timeoutMs = DEFAULT_TIMEOUT_MS, endpoint = "openai" } = {}) {
  try {
    return await withTimeout(fn(), timeoutMs);
  } catch (err) {
    if (!isTransient(err)) {
      captureError(err, { source: endpoint, retry: "no" });
      throw err;
    }
    console.warn(`[${endpoint}] transient error, retrying once:`, err.message);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (err2) {
      captureError(err2, { source: endpoint, retry: "exhausted" });
      throw err2;
    }
  }
}

export { STREAM_CEILING_MS, DEFAULT_TIMEOUT_MS };
