// End-to-end verification of the deployed demo.
// Loads each key route in a headless browser, checks rendered DOM (not just HTTP code),
// captures console errors, verifies images load, screenshots a few key surfaces.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const URL = process.env.URL || "https://dispatch-six-rho.vercel.app";
const OUT = resolve(process.cwd(), ".verify-deploy");
mkdirSync(OUT, { recursive: true });

const results = [];
const consoleByPage = {};
const failedRequestsByPage = {};

function pass(name, detail = "") { results.push({ ok: true, name, detail }); console.log(`✓ ${name}${detail ? "  — " + detail : ""}`); }
function fail(name, detail = "") { results.push({ ok: false, name, detail }); console.log(`✗ ${name}${detail ? "  — " + detail : ""}`); }

async function checkPage(browser, path, assertions) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message.slice(0, 200)));
  page.on("requestfailed", (req) => {
    const u = req.url();
    // Ignore failures on intentional missing endpoints in static-only deploy
    if (u.includes("/api/me") || u.includes("/api/auth/")) return;
    failedRequests.push(`${req.method()} ${u.slice(0, 120)} — ${req.failure()?.errorText || "?"}`);
  });

  try {
    const resp = await page.goto(`${URL}${path}`, { waitUntil: "networkidle", timeout: 25_000 });
    await page.waitForTimeout(800);

    if (!resp || !resp.ok()) {
      fail(`${path}  HTTP`, `status=${resp?.status() || "no response"}`);
    } else {
      pass(`${path}  HTTP`, `status=${resp.status()}`);
    }

    await assertions(page, path);

    if (consoleErrors.length) {
      fail(`${path}  console`, `${consoleErrors.length} error(s): ${consoleErrors[0].slice(0, 100)}`);
    } else {
      pass(`${path}  console clean`);
    }
    if (failedRequests.length) {
      fail(`${path}  network`, `${failedRequests.length} failed: ${failedRequests[0].slice(0, 100)}`);
    } else {
      pass(`${path}  network clean`);
    }

    consoleByPage[path] = consoleErrors;
    failedRequestsByPage[path] = failedRequests;
  } catch (err) {
    fail(`${path}  load`, err.message.slice(0, 200));
  } finally {
    await ctx.close();
  }
}

async function main() {
  console.log(`Verifying ${URL}\n`);
  const browser = await chromium.launch();

  // 1. Landing
  await checkPage(browser, "/", async (page) => {
    const masthead = await page.locator(".masthead-title").isVisible();
    masthead ? pass("/ masthead visible") : fail("/ masthead missing");
    const heroH = await page.locator("h2.font-display").first().innerText().catch(() => "");
    heroH.includes("HackerNews") ? pass("/ hero headline correct") : fail("/ hero headline", heroH.slice(0, 80));
    const ctaCount = await page.locator("a:has-text('today\\'s brief'), a:has-text('Subscribe')").count();
    ctaCount >= 2 ? pass("/ CTAs present", `count=${ctaCount}`) : fail("/ CTAs missing", `count=${ctaCount}`);
    const lede = await page.locator(".lede-banner").innerText().catch(() => "");
    lede.length > 10 ? pass("/ today's lede banner populated", lede.slice(0, 60)) : fail("/ today's lede empty");
    const noindex = await page.locator('meta[name="robots"]').getAttribute("content").catch(() => "");
    noindex.includes("noindex") ? pass("/ noindex meta present") : fail("/ noindex meta missing");
  });

  // 2. /demo — the resume's primary surface
  await checkPage(browser, "/demo", async (page) => {
    const callouts = await page.locator(".demo-callout").count();
    callouts >= 3 ? pass("/demo callouts", `count=${callouts}`) : fail("/demo callouts", `count=${callouts}`);
    const pickBanner = await page.locator(".editors-pick-banner").isVisible().catch(() => false);
    pickBanner ? pass("/demo editor's pick rendered") : fail("/demo editor's pick missing");
    const headline = await page.locator("h2.font-display.text-4xl, h2.font-display.text-5xl").first().innerText().catch(() => "");
    headline.length > 5 ? pass("/demo brief headline present", headline.slice(0, 70)) : fail("/demo brief headline empty");
    // The closing reveal should appear after a short delay
    await page.waitForTimeout(1500);
    const reveal = await page.locator("text=What just happened").isVisible().catch(() => false);
    reveal ? pass("/demo 'what just happened' reveal") : fail("/demo reveal missing");
  });

  // 3. /showcase — the portfolio surface
  await checkPage(browser, "/showcase", async (page) => {
    const imgs = await page.locator(".showcase-shot img").count();
    imgs >= 6 ? pass("/showcase screenshots", `count=${imgs}`) : fail("/showcase screenshots", `count=${imgs}`);
    // Verify each image actually loaded (naturalWidth > 0)
    const broken = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll(".showcase-shot img")];
      return imgs.filter((i) => !i.naturalWidth || i.naturalHeight < 50).map((i) => i.src);
    });
    broken.length === 0 ? pass("/showcase all images loaded") : fail("/showcase broken images", `${broken.length}: ${broken[0]?.slice(-60)}`);
    const ctas = await page.locator("a:has-text('today\\'s brief'), a:has-text('GitHub')").count();
    ctas >= 1 ? pass("/showcase CTAs present") : fail("/showcase no CTAs");
  });

  // 4. Static pages — manifesto, press, changelog, say-hi
  for (const path of ["/manifesto", "/press", "/changelog", "/say-hi", "/about"]) {
    await checkPage(browser, path, async (page) => {
      const masthead = await page.locator(".masthead-title").isVisible();
      masthead ? pass(`${path} masthead`) : fail(`${path} masthead missing`);
      // Use evaluate for raw body text — locator with comma resolves multiple, breaks innerText
      const bodyLen = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
      bodyLen > 500 ? pass(`${path} content`, `${bodyLen} chars`) : fail(`${path} thin content`, `${bodyLen} chars`);
    });
  }

  // 5. Robots + sample-brief.json
  await checkPage(browser, "/robots.txt", async (page) => {
    const txt = await page.locator("body").innerText();
    txt.includes("Disallow: /") ? pass("/robots.txt disallow all") : fail("/robots.txt missing disallow");
  });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const briefResp = await p.goto(`${URL}/sample-brief.json`, { timeout: 15_000 });
  if (briefResp.ok()) {
    const json = JSON.parse(await p.locator("body").innerText());
    json.headline && json.sections?.length
      ? pass("/sample-brief.json valid", `${json.sections.length} sections, headline="${json.headline.slice(0, 50)}…"`)
      : fail("/sample-brief.json malformed");
  } else {
    fail("/sample-brief.json HTTP", `status=${briefResp.status()}`);
  }
  await ctx.close();

  // 6. Mobile viewport check
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await mobileCtx.newPage();
  await mp.goto(`${URL}/`, { waitUntil: "networkidle", timeout: 25_000 });
  await mp.waitForTimeout(800);
  await mp.screenshot({ path: resolve(OUT, "mobile-landing.png") });
  const mastheadMobile = await mp.locator(".masthead-title").isVisible();
  mastheadMobile ? pass("mobile / masthead visible") : fail("mobile / masthead missing");
  const navTrigger = await mp.locator(".nav-trigger").isVisible();
  navTrigger ? pass("mobile / nav drawer trigger present") : fail("mobile / nav trigger missing");
  await mobileCtx.close();

  // 7. /try — graceful failure expected (no backend)
  await checkPage(browser, "/try", async (page) => {
    const masthead = await page.locator(".masthead-title").isVisible();
    masthead ? pass("/try renders") : fail("/try blank");
    const onboarding = await page.locator('button:has-text("Software Engineer"), button:has-text("CS Student")').count();
    onboarding > 0 ? pass("/try onboarding step renders", `${onboarding} role buttons`) : fail("/try onboarding missing");
  });

  // 8. 404 page — React renders NotFound for any unmatched route
  await checkPage(browser, "/this-route-definitely-doesnt-exist", async (page) => {
    // NotFound component contains a big "404" element + "Page not found" eyebrow
    const has404 = await page.locator('text="404"').first().isVisible().catch(() => false);
    const hasPageNotFound = await page.locator('text=/page not found/i').first().isVisible().catch(() => false);
    (has404 || hasPageNotFound) ? pass("/404 page renders") : fail("/404 page missing");
  });

  await browser.close();

  // Save full report
  const summary = {
    url: URL,
    at: new Date().toISOString(),
    pass: results.filter((r) => r.ok).length,
    fail: results.filter((r) => !r.ok).length,
    results,
    consoleByPage,
    failedRequestsByPage,
  };
  writeFileSync(resolve(OUT, "report.json"), JSON.stringify(summary, null, 2));

  console.log(`\n${"=".repeat(60)}`);
  console.log(`PASS: ${summary.pass}    FAIL: ${summary.fail}`);
  console.log(`Full report → ${resolve(OUT, "report.json")}`);
  console.log(`Mobile screenshot → ${resolve(OUT, "mobile-landing.png")}`);

  if (summary.fail > 0) {
    console.log("\nFailures:");
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  ✗ ${r.name}  ${r.detail ? "— " + r.detail : ""}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
