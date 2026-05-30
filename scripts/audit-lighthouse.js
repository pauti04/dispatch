// Lighthouse audit — runs against key pages on the live URL.
// Reports Performance / Accessibility / Best Practices / SEO scores per page,
// then surfaces the top opportunities (savings > 100ms) and any failed
// best-practice audits so the polish list stays short and actionable.
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const URL = process.env.URL || "https://dispatch-six-rho.vercel.app";
const ROUTES = ["/", "/demo", "/showcase", "/manifesto", "/today"];

const chrome = await chromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});

const summaries = [];
const opportunities = {};
const failedAudits = {};

for (const path of ROUTES) {
  console.log(`\n→ ${path}`);
  const runner = await lighthouse(`${URL}${path}`, {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  });
  const { categories, audits } = runner.lhr;
  const row = {
    path,
    perf: Math.round((categories.performance?.score || 0) * 100),
    a11y: Math.round((categories.accessibility?.score || 0) * 100),
    bp: Math.round((categories["best-practices"]?.score || 0) * 100),
    seo: Math.round((categories.seo?.score || 0) * 100),
    fcp: audits["first-contentful-paint"]?.numericValue,
    lcp: audits["largest-contentful-paint"]?.numericValue,
    cls: audits["cumulative-layout-shift"]?.numericValue,
    tbt: audits["total-blocking-time"]?.numericValue,
  };
  summaries.push(row);
  console.log(
    `  perf=${row.perf} a11y=${row.a11y} bp=${row.bp} seo=${row.seo} ` +
    `LCP=${Math.round(row.lcp)}ms CLS=${row.cls?.toFixed(3)} TBT=${Math.round(row.tbt)}ms`
  );

  // Collect opportunities & diagnostics savings > 100ms
  for (const [id, audit] of Object.entries(audits)) {
    if (audit.score !== null && audit.score < 1 && audit.details?.overallSavingsMs > 100) {
      opportunities[id] ||= { title: audit.title, savings: 0, routes: [] };
      opportunities[id].savings = Math.max(opportunities[id].savings, audit.details.overallSavingsMs);
      opportunities[id].routes.push(path);
    }
  }

  // Collect failed best-practices/SEO non-perf audits, ignoring rules the
  // deploy is *deliberately* failing (the unlisted demo is meant to be
  // uncrawlable — that's a feature, not a bug).
  const IGNORED = new Set([
    "is-crawlable", // we ship <meta name="robots" content="noindex"> on purpose
    "robots-txt",   // unlisted demo, robots.txt blocks everything intentionally
  ]);
  for (const catKey of ["best-practices", "seo"]) {
    for (const ref of categories[catKey]?.auditRefs || []) {
      const a = audits[ref.id];
      if (a && a.score !== null && a.score < 1 && !IGNORED.has(ref.id)) {
        failedAudits[ref.id] ||= { title: a.title, category: catKey, description: a.description?.slice(0, 200), routes: [] };
        failedAudits[ref.id].routes.push(path);
      }
    }
  }
}

await chrome.kill();

console.log("\n" + "=".repeat(78));
console.log("\n# Summary\n");
console.log(`${"Route".padEnd(20)} Perf  A11y  BP    SEO   LCP(ms)  CLS    TBT(ms)`);
for (const r of summaries) {
  console.log(
    `${r.path.padEnd(20)} ${String(r.perf).padEnd(5)} ${String(r.a11y).padEnd(5)} ${String(r.bp).padEnd(5)} ${String(r.seo).padEnd(5)} ` +
    `${String(Math.round(r.lcp)).padEnd(8)} ${r.cls?.toFixed(3).padEnd(6)} ${String(Math.round(r.tbt))}`
  );
}

if (Object.keys(opportunities).length) {
  console.log(`\n# Performance opportunities (savings > 100ms)\n`);
  const sorted = Object.entries(opportunities).sort((a, b) => b[1].savings - a[1].savings);
  for (const [id, op] of sorted) {
    console.log(`  ${id} — ${op.title} (~${Math.round(op.savings)}ms)`);
    console.log(`    routes: ${op.routes.join(", ")}`);
  }
}

if (Object.keys(failedAudits).length) {
  console.log(`\n# Failed best-practices / SEO audits\n`);
  for (const [id, a] of Object.entries(failedAudits)) {
    console.log(`  [${a.category}] ${id} — ${a.title}`);
    console.log(`    routes: ${a.routes.join(", ")}`);
    if (a.description) console.log(`    ${a.description.slice(0, 140)}`);
  }
} else {
  console.log(`\n# All best-practices + SEO audits passed.`);
}
