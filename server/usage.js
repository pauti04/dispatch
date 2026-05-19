// Lightweight usage logger for OpenAI calls.
// Call sites: brief.js writer + judge, quality.js, embeddings.js, tts.js, reports.js, skills.js.
// Pricing table is approximate (gpt-4o-mini, text-embedding-3-small, gpt-4o-mini-tts).
// Cost stored as integer micro-USD (1_000_000 = $1) for fast SUM() math.

import { sql } from "./db.js";

const PRICES_PER_MTOKEN = {
  // $/1M input tokens, $/1M output tokens
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10.0 },
  "text-embedding-3-small": { in: 0.02, out: 0 },
  "text-embedding-3-large": { in: 0.13, out: 0 },
  // OpenAI TTS is character-based; we approximate using completion_tokens as char count.
  "gpt-4o-mini-tts": { in: 0, out: 15.0 / 1_000_000 }, // $15 / 1M chars; mapped via completion_tokens
};

function microUsdCost({ model, prompt_tokens = 0, completion_tokens = 0 }) {
  const p = PRICES_PER_MTOKEN[model];
  if (!p) return null;
  const dollars = (prompt_tokens / 1_000_000) * p.in + (completion_tokens / 1_000_000) * p.out;
  return Math.round(dollars * 1_000_000);
}

/**
 * Fire-and-forget write. Never throws — failures log and continue.
 */
export async function logUsage({ userId, endpoint, model, prompt_tokens, completion_tokens, total_tokens }) {
  try {
    const cost = microUsdCost({ model, prompt_tokens, completion_tokens });
    await sql`
      insert into usage_log (user_id, endpoint, model, prompt_tokens, completion_tokens, total_tokens, cost_micro_usd)
      values (${userId || null}, ${endpoint}, ${model}, ${prompt_tokens || null}, ${completion_tokens || null}, ${total_tokens || null}, ${cost})
    `;
  } catch (err) {
    // DB may not be reachable in dev — silently degrade
  }
}

/**
 * Admin: top-spending users over a window.
 */
export async function topSpenders({ days = 7, limit = 20 } = {}) {
  return sql`
    select u.email, sum(l.cost_micro_usd)::bigint as cost_micro_usd, count(*)::int as calls
    from usage_log l
    left join users u on u.id = l.user_id
    where l.created_at > now() - (interval '1 day' * ${days})
    group by u.email
    order by cost_micro_usd desc nulls last
    limit ${limit}
  `;
}

/**
 * Admin: daily total cost across all users for the last N days.
 */
export async function dailyTotals({ days = 30 } = {}) {
  return sql`
    select date_trunc('day', created_at)::date as day,
           sum(cost_micro_usd)::bigint as cost_micro_usd,
           count(*)::int as calls
    from usage_log
    where created_at > now() - (interval '1 day' * ${days})
    group by day
    order by day desc
  `;
}

/**
 * Admin: breakdown by endpoint + model for the last N days.
 */
export async function breakdownByEndpoint({ days = 7 } = {}) {
  return sql`
    select endpoint, model,
           sum(cost_micro_usd)::bigint as cost_micro_usd,
           count(*)::int as calls,
           sum(total_tokens)::bigint as tokens
    from usage_log
    where created_at > now() - (interval '1 day' * ${days})
    group by endpoint, model
    order by cost_micro_usd desc nulls last
  `;
}

/* ─── Wave N Day 2 — daily cost threshold check ───────────── */

/**
 * Sum today's spend (UTC day) from usage_log, returning USD as a float.
 */
export async function getTodayCostUsd() {
  try {
    const rows = await sql`
      select coalesce(sum(cost_micro_usd), 0)::bigint as micro
      from usage_log
      where created_at >= date_trunc('day', now())
    `;
    const micro = Number(rows[0]?.micro || 0);
    return micro / 1_000_000;
  } catch {
    return 0;
  }
}

/**
 * Idempotent threshold check. Reads env vars:
 *   COST_ALERT_THRESHOLD_USD — float; default 5.00
 *   COST_ALERT_WEBHOOK_URL   — Slack-incoming-webhook-style POST receiver (or Discord, etc.)
 *
 * When today's spend crosses the threshold, fires ONE alert per UTC day by remembering
 * the last-alerted day in module-scope. Restarts reset the flag, so duplicate alerts
 * after a redeploy are possible — acceptable trade-off vs. a DB-backed flag.
 */
const THRESHOLD_USD = parseFloat(process.env.COST_ALERT_THRESHOLD_USD || "5.00");
const WEBHOOK_URL = process.env.COST_ALERT_WEBHOOK_URL;
let lastAlertedUtcDay = null;

export async function checkDailyCostThreshold() {
  try {
    if (!WEBHOOK_URL || !isFinite(THRESHOLD_USD) || THRESHOLD_USD <= 0) return;
    const todayUsd = await getTodayCostUsd();
    if (todayUsd < THRESHOLD_USD) return;
    const today = new Date().toISOString().slice(0, 10);
    if (lastAlertedUtcDay === today) return; // already fired today
    lastAlertedUtcDay = today;

    const text = `🟠 Dispatch — today's OpenAI spend has crossed $${THRESHOLD_USD.toFixed(2)} (now $${todayUsd.toFixed(2)}). Investigate /admin/costs.`;
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    console.log(`cost alert: fired at $${todayUsd.toFixed(2)} (threshold $${THRESHOLD_USD.toFixed(2)})`);
    return { alerted: true, todayUsd, thresholdUsd: THRESHOLD_USD };
  } catch (err) {
    console.warn("cost alert failed (non-fatal):", err.message);
    return { alerted: false, error: err.message };
  }
}
