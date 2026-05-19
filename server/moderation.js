// Lightweight content moderation. Filter out scam / SEO-spam / clickbait clusters from the pool
// BEFORE the writer LLM sees them. This is a soft filter — anything ambiguous stays in.
// We're conservative: false-negative > false-positive (an ML engineer reads us, not a kid).

const SCAM_PATTERNS = [
  // Crypto rug-pull keywords (combined — single one is fine, two+ is a flag)
  /\b(rugpull|pump and dump|moon shot|to the moon|100x gem|presale)\b/i,
  // "Make money" / get-rich-quick patterns
  /\b(passive income|side hustle|make \$\d+ in \d+ days|crypto millionaire)\b/i,
  // SEO-spam telltales
  /\b(click here|read more here|amazing trick|you won't believe|shocking truth)\b/i,
];

const SCAM_HOSTS = new Set([
  "medium.com/@", // generic medium spam — too broad on its own, keep in case we add subdomain logic
  // Specific scam-prone hosts could go here. Keeping the list short so we don't accidentally
  // block legit publications.
]);

const NSFW_PATTERNS = [
  /\b(onlyfans|porn|escort|nsfw|xxx)\b/i,
];

/**
 * Returns true if a cluster should be filtered.
 */
export function shouldFilter(cluster) {
  if (!cluster?.primary?.item) return false;
  const item = cluster.primary.item;
  const text = [item.title, item.description, item.summary].filter(Boolean).join(" ");

  let scamHits = 0;
  for (const re of SCAM_PATTERNS) if (re.test(text)) scamHits++;
  if (scamHits >= 2) return true;

  for (const re of NSFW_PATTERNS) if (re.test(text)) return true;

  // URL-based filter (currently a stub — extend as needed)
  if (item.url) {
    try {
      const host = new URL(item.url).hostname.toLowerCase();
      for (const h of SCAM_HOSTS) {
        if (host.includes(h)) return true;
      }
    } catch {}
  }

  return false;
}

/**
 * Filter a clusters list. Returns { kept, removed_count } for logging.
 */
export function moderateClusters(clusters) {
  const kept = [];
  let removed = 0;
  for (const c of clusters) {
    if (shouldFilter(c)) {
      removed++;
      continue;
    }
    kept.push(c);
  }
  if (removed > 0) {
    console.log(`moderation: filtered ${removed} cluster(s) from a pool of ${clusters.length}`);
  }
  return { kept, removed_count: removed };
}
