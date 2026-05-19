// Prompt variants — A/B testing for the editor prompt. Lightweight: each call picks a variant
// by weight, applies any overrides to the buildPrompt scaffolding, and stamps brief_scores
// with the variant_id so we can roll up wins.

import { sql } from "./db.js";

let cache = null;
let cacheAt = 0;
const TTL_MS = 5 * 60 * 1000;

async function loadVariants() {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;
  try {
    const rows = await sql`select id, weight, template_overrides from prompt_variants where weight > 0`;
    cache = rows;
    cacheAt = Date.now();
    return rows;
  } catch {
    // DB unreachable — return a stub so brief generation still works without A/B
    return [{ id: "control", weight: 100, template_overrides: {} }];
  }
}

/**
 * Pick a variant for this generation by weight.
 * Returns { id, template_overrides }.
 */
export async function pickVariant() {
  const variants = await loadVariants();
  if (!variants.length) return { id: "control", template_overrides: {} };
  const total = variants.reduce((s, v) => s + (v.weight || 0), 0);
  if (total === 0) return { id: "control", template_overrides: {} };
  let r = Math.random() * total;
  for (const v of variants) {
    r -= v.weight;
    if (r <= 0) return { id: v.id, template_overrides: v.template_overrides || {} };
  }
  return { id: variants[0].id, template_overrides: variants[0].template_overrides || {} };
}

/**
 * Aggregate score per variant over the past N days. Used by /api/admin/ab-results.
 */
export async function variantResults({ days = 14 } = {}) {
  return sql`
    select variant_id,
           count(*)::int as n,
           round(avg(coherence)::numeric, 2) as coherence_avg,
           round(avg(career_relevance)::numeric, 2) as career_avg,
           round(avg(voice_fidelity)::numeric, 2) as voice_avg,
           round(avg(overall)::numeric, 2) as overall_avg
    from brief_scores
    where created_at > now() - (interval '1 day' * ${days})
      and variant_id is not null
    group by variant_id
    order by overall_avg desc nulls last
  `;
}
