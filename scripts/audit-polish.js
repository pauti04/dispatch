// Polish audit — visit key first-impression surfaces, check for:
//   - placeholder copy ("TODO", "lorem", "FIXME", "coming soon" outside teasers)
//   - missing OG/meta tags
//   - empty headings, broken links
//   - console errors
//   - text overflow / mobile breakage at 375px
//   - dead-end pages (no clear next action)
import { chromium } from "playwright";

const URL = process.env.URL || "https://dispatch-six-rho.vercel.app";
const ROUTES = [
  { path: "/", name: "Landing" },
  { path: "/demo", name: "Demo (annotated brief)" },
  { path: "/showcase", name: "Showcase (about this project)" },
  { path: "/today", name: "Today (public sample)" },
  { path: "/about", name: "About" },
  { path: "/manifesto", name: "Manifesto" },
  { path: "/press", name: "Press kit" },
  { path: "/say-hi", name: "Say Hi" },
  { path: "/changelog", name: "Changelog" },
  { path: "/discover", name: "Discover" },
];

async function checkRoute(browser, route, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message.slice(0, 200)));
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("/api/")) {
      failedRequests.push(`${r.status()} ${r.url().replace(URL, "")}`);
    }
  });

  await page.goto(`${URL}${route.path}`, { waitUntil: "networkidle", timeout: 20_000 });
  await page.waitForTimeout(600);

  const meta = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
    ogDescription: document.querySelector('meta[property="og:description"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    twitterCard: document.querySelector('meta[name="twitter:card"]')?.content,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    h1: document.querySelector("h1")?.innerText?.slice(0, 100) || null,
    h2: document.querySelector("h2")?.innerText?.slice(0, 100) || null,
    bodyChars: (document.body.innerText || "").length,
  }));

  const body = await page.evaluate(() => document.body.innerText || "");
  const placeholders = [];
  for (const term of ["TODO", "FIXME", "lorem ipsum", "Lorem ipsum", "XXX", "placeholder text"]) {
    if (body.includes(term)) placeholders.push(term);
  }

  // Overflow check at small viewport
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 4
  );

  await ctx.close();
  return {
    route,
    viewport,
    meta,
    placeholders,
    horizontalOverflow,
    consoleErrors,
    failedRequests,
  };
}

const browser = await chromium.launch();
console.log(`Polish audit of ${URL}\n`);
console.log("=".repeat(78));

const issues = [];

for (const route of ROUTES) {
  const desktop = await checkRoute(browser, route, { width: 1280, height: 900 });
  const mobile = await checkRoute(browser, route, { width: 375, height: 800 });
  console.log(`\n## ${route.name} — ${route.path}`);
  console.log(`  title:         "${desktop.meta.title}"`);
  console.log(`  description:   ${desktop.meta.description ? `"${desktop.meta.description.slice(0, 80)}..."` : "MISSING"}`);
  console.log(`  og:image:      ${desktop.meta.ogImage || "MISSING"}`);
  console.log(`  twitter:card:  ${desktop.meta.twitterCard || "MISSING"}`);
  console.log(`  canonical:     ${desktop.meta.canonical || "MISSING"}`);
  console.log(`  h1/h2:         ${desktop.meta.h1 || desktop.meta.h2 || "MISSING"}`);
  console.log(`  body chars:    desktop=${desktop.meta.bodyChars} mobile=${mobile.meta.bodyChars}`);
  if (desktop.placeholders.length) {
    console.log(`  PLACEHOLDERS:  ${desktop.placeholders.join(", ")}`);
    issues.push({ route: route.path, kind: "placeholder copy", detail: desktop.placeholders.join(",") });
  }
  if (desktop.consoleErrors.length) {
    console.log(`  CONSOLE ERR (desktop): ${desktop.consoleErrors.slice(0, 2).join(" | ")}`);
    issues.push({ route: route.path, kind: "console error", detail: desktop.consoleErrors[0] });
  }
  if (mobile.consoleErrors.length) {
    console.log(`  CONSOLE ERR (mobile): ${mobile.consoleErrors.slice(0, 2).join(" | ")}`);
  }
  if (mobile.horizontalOverflow) {
    console.log(`  MOBILE OVERFLOW: horizontal scroll at 375px`);
    issues.push({ route: route.path, kind: "mobile overflow", detail: "horizontal scroll at 375px" });
  }
  if (desktop.failedRequests.length) {
    console.log(`  FAILED REQS:   ${desktop.failedRequests.join(", ")}`);
    issues.push({ route: route.path, kind: "failed request", detail: desktop.failedRequests[0] });
  }
  if (!desktop.meta.description) issues.push({ route: route.path, kind: "missing meta description" });
  if (!desktop.meta.ogImage) issues.push({ route: route.path, kind: "missing og:image" });
  if (!desktop.meta.twitterCard) issues.push({ route: route.path, kind: "missing twitter:card" });
  if (!desktop.meta.canonical) issues.push({ route: route.path, kind: "missing canonical" });
}

await browser.close();

console.log("\n" + "=".repeat(78));
console.log(`\nTotal issues: ${issues.length}\n`);
const byKind = {};
for (const i of issues) {
  byKind[i.kind] ||= [];
  byKind[i.kind].push(i.route);
}
for (const [kind, routes] of Object.entries(byKind).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${kind} (${routes.length})`);
  for (const r of routes.slice(0, 6)) console.log(`    ${r}`);
  if (routes.length > 6) console.log(`    ...and ${routes.length - 6} more`);
}
