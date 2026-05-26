// Local audit — exercises every authed route against a vite-preview running
// on 0.0.0.0:4173, accessed via the LAN IP so window.location.hostname !==
// localhost/127.0.0.1 and IS_STATIC_ONLY evaluates true. Verifies:
//   - DemoModeNotice renders (no raw "UNAVAILABLE" / "expected JSON" text)
//   - No 404 requests fly to /api/*
//   - No console errors
//
// Run after: cd client && npx vite preview --port 4173 --host 0.0.0.0
//
// Then:    URL=http://192.168.10.254:4173 node scripts/audit-static-only.js

import { chromium } from "playwright";

const URL = process.env.URL || "http://192.168.10.254:4173";
const ROUTES = [
  "/", "/today", "/demo", "/showcase", "/manifesto", "/press", "/say-hi",
  "/about", "/privacy", "/terms", "/changelog", "/early", "/discover",
  "/try", "/signup", "/login", "/verify?token=abc",
  "/account", "/saved", "/archive", "/streak", "/referrals", "/search",
  "/edition/test-slug", "/unsubscribe?t=abc", "/i/test-token",
  "/finance", "/design", "/ai-research", "/cybersecurity-weekly",
];

const results = [];

async function audit(browser, path) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const api404s = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message.slice(0, 200)));
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("/api/") && r.status() >= 400) {
      api404s.push(`${r.status()} ${u.replace(URL, "")}`);
    }
  });

  try {
    await page.goto(`${URL}${path}`, { waitUntil: "networkidle", timeout: 15_000 });
    await page.waitForTimeout(800);
    const body = await page.evaluate(() => document.body.innerText || "");
    const hasUglyError =
      body.includes("UNAVAILABLE") ||
      body.includes("expected JSON") ||
      body.includes("HTTP 404") ||
      body.includes("HTTP 501") ||
      body.includes("staticOnly");
    const hasDemoNotice = body.includes("Demo mode") || body.includes("public demo");
    const status = {
      path,
      ok: !hasUglyError && consoleErrors.length === 0 && api404s.length === 0,
      hasDemoNotice,
      hasUglyError,
      consoleErrors: consoleErrors.length,
      api404s: api404s.length,
      bodyChars: body.length,
      firstErr: consoleErrors[0] || api404s[0] || null,
    };
    results.push(status);
    console.log(
      `${status.ok ? "✓" : "✗"} ${path.padEnd(34)} body=${String(status.bodyChars).padStart(4)} ` +
      `demo-notice=${hasDemoNotice ? "Y" : "·"} ugly=${hasUglyError ? "Y" : "·"} ` +
      `console=${status.consoleErrors} api404=${status.api404s}` +
      (status.firstErr ? ` :: ${status.firstErr.slice(0, 100)}` : "")
    );
  } catch (err) {
    results.push({ path, ok: false, error: err.message.slice(0, 200) });
    console.log(`✗ ${path.padEnd(34)} LOAD FAIL ${err.message.slice(0, 100)}`);
  } finally {
    await ctx.close();
  }
}

const browser = await chromium.launch();
console.log(`Static-only audit of ${URL}\n`);

for (const path of ROUTES) {
  await audit(browser, path);
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} clean.`);
if (failed.length) {
  console.log(`\nFailed routes:`);
  for (const f of failed) console.log(`  ${f.path}${f.firstErr ? " — " + f.firstErr.slice(0, 120) : ""}`);
  process.exit(1);
}
