// Accessibility audit via axe-core. Reports WCAG violations grouped by
// severity per route. Filters down to actionable issues (serious + critical)
// and groups duplicates across routes so the fix list is short.
//
// Usage:  URL=https://dispatch-six-rho.vercel.app node scripts/audit-a11y.js
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const URL = process.env.URL || "https://dispatch-six-rho.vercel.app";
const ROUTES = [
  "/", "/demo", "/showcase", "/today", "/about", "/manifesto", "/press",
  "/say-hi", "/changelog", "/discover", "/privacy", "/terms", "/early",
  "/signup", "/login", "/account", "/saved", "/streak", "/referrals",
  "/search", "/archive", "/edition/test", "/finance", "/ai-research",
  "/this-does-not-exist",
];

const allViolations = [];

const browser = await chromium.launch();
console.log(`A11y audit of ${URL}\n`);

for (const path of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(`${URL}${path}`, { waitUntil: "networkidle", timeout: 20_000 });
    await page.waitForTimeout(400);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();
    const sev = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const v of violations) {
      sev[v.impact || "minor"]++;
      allViolations.push({
        route: path,
        impact: v.impact,
        id: v.id,
        help: v.help,
        helpUrl: v.helpUrl,
        nodeCount: v.nodes.length,
        sample: v.nodes[0]?.html?.slice(0, 120),
      });
    }
    const sigil = (sev.critical + sev.serious) === 0 ? "✓" : "✗";
    console.log(
      `${sigil} ${path.padEnd(34)} crit=${sev.critical} ser=${sev.serious} mod=${sev.moderate} min=${sev.minor}`
    );
  } catch (err) {
    console.log(`✗ ${path.padEnd(34)} LOAD FAIL ${err.message.slice(0, 80)}`);
  } finally {
    await ctx.close();
  }
}

await browser.close();

console.log("\n" + "=".repeat(78));
console.log(`\nTotal violations: ${allViolations.length}\n`);

// Group by rule id + impact
const byRule = {};
for (const v of allViolations) {
  const key = `${v.impact}:${v.id}`;
  byRule[key] ||= { ...v, routes: [] };
  byRule[key].routes.push(v.route);
}

const sorted = Object.values(byRule).sort((a, b) => {
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  return order[a.impact] - order[b.impact] || b.routes.length - a.routes.length;
});

for (const v of sorted) {
  console.log(`\n[${v.impact?.toUpperCase()}] ${v.id} — ${v.help}`);
  console.log(`  Affects ${v.routes.length} routes: ${v.routes.slice(0, 5).join(", ")}${v.routes.length > 5 ? ` …+${v.routes.length - 5}` : ""}`);
  if (v.sample) console.log(`  Sample: ${v.sample.replace(/\s+/g, " ")}`);
  console.log(`  Fix:    ${v.helpUrl}`);
}
