// Interactive flow tests — exercises real user paths, not just page loads.
// Catches things that HTTP 200 + DOM-rendered missed:
//   - Form submissions
//   - Click-through navigation
//   - Auth-gated routes behavior
//   - Nav drawer + keyboard shortcuts
//   - Console errors that fire on interaction (not just on load)
//   - All footer + internal links

import { chromium } from "playwright";

const URL = process.env.URL || "https://dispatch-six-rho.vercel.app";
const results = [];

function pass(name, detail = "") {
  results.push({ ok: true, name, detail });
  console.log(`✓ ${name}${detail ? "  — " + detail : ""}`);
}
function fail(name, detail = "") {
  results.push({ ok: false, name, detail });
  console.log(`✗ ${name}${detail ? "  — " + detail : ""}`);
}

async function loadPage(browser, path) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 250));
  });
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message.slice(0, 250)));
  await page.goto(`${URL}${path}`, { waitUntil: "networkidle", timeout: 25_000 });
  await page.waitForTimeout(800);
  return { ctx, page, consoleErrors };
}

async function main() {
  console.log(`Interactive verification of ${URL}\n`);
  const browser = await chromium.launch();

  // ─── TEST 1: Signup form actually submits gracefully ───────────────
  console.log("\n— Signup form submission");
  {
    const { ctx, page, consoleErrors } = await loadPage(browser, "/signup");
    try {
      const emailInput = page.locator('input[type="email"]');
      const visible = await emailInput.isVisible();
      visible ? pass("/signup email input visible") : fail("/signup no email input");
      if (visible) {
        await emailInput.fill("test@example.com");
        const submit = page.locator('button.btn-primary:has-text("Send")');
        await submit.click().catch(() => {});
        // Wait for either success state, error, or sit-and-spin
        await page.waitForTimeout(3000);
        const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
        const onCheckInbox = bodyText.includes("Check your inbox") || bodyText.includes("magic link");
        const onError = bodyText.toLowerCase().includes("error") || bodyText.includes("unavailable") || bodyText.includes("static demo");
        const stillOnForm = await emailInput.isVisible().catch(() => false);
        if (onCheckInbox) pass("/signup success state shown");
        else if (onError) pass("/signup graceful error", "static-mode rejection visible");
        else if (stillOnForm) fail("/signup HANGS", "no success, no error, form still showing — silent failure");
        else fail("/signup unexpected state", bodyText.slice(0, 100));
      }
      consoleErrors.length === 0 ? pass("/signup console clean") : fail("/signup console", `${consoleErrors.length} errors`);
    } finally { await ctx.close(); }
  }

  // ─── TEST 2: Login form ────────────────────────────────────────────
  console.log("\n— Login form submission");
  {
    const { ctx, page } = await loadPage(browser, "/login");
    try {
      const emailInput = page.locator('input[type="email"]');
      const visible = await emailInput.isVisible();
      visible ? pass("/login email input visible") : fail("/login no email input");
      if (visible) {
        await emailInput.fill("returninguser@example.com");
        const submit = page.locator('button.btn-primary:has-text("Send")');
        await submit.click().catch(() => {});
        await page.waitForTimeout(3000);
        const bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.includes("Check your inbox") || bodyText.includes("magic link") || bodyText.toLowerCase().includes("error") || bodyText.includes("static demo") || bodyText.includes("unavailable")) {
          pass("/login form submit handled");
        } else {
          fail("/login HANGS", bodyText.slice(0, 100));
        }
      }
    } finally { await ctx.close(); }
  }

  // ─── TEST 3: /try complete onboarding flow ─────────────────────────
  console.log("\n— /try onboarding click-through");
  {
    const { ctx, page } = await loadPage(browser, "/try");
    try {
      // Step I: role
      const roleBtn = page.locator('button:has-text("Software Engineer")').first();
      await roleBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      // Step II: skill
      const skillBtn = page.locator('button:has-text("Intermediate")').first();
      const skillVisible = await skillBtn.isVisible().catch(() => false);
      skillVisible ? pass("/try step II reached after role click") : fail("/try step II didn't show after role click");
      if (skillVisible) {
        await skillBtn.click();
        await page.waitForTimeout(600);
      }
      // Step III: domains
      const domainBtns = await page.locator('button:has-text("Backend Development")').count();
      domainBtns > 0 ? pass("/try step III reached after skill click", `${domainBtns} domain buttons`) : fail("/try step III didn't show");
      if (domainBtns > 0) {
        await page.locator('button:has-text("Backend Development")').first().click().catch(() => {});
        await page.locator('button:has-text("Developer Tools")').first().click().catch(() => {});
        await page.waitForTimeout(400);
        // Submit
        const submitBtn = page.locator('button:has-text("Show me today")').first();
        const submitVisible = await submitBtn.isVisible().catch(() => false);
        submitVisible ? pass("/try submit button appears after domains picked") : fail("/try no submit button");
        if (submitVisible) {
          await submitBtn.click().catch(() => {});
          // Wait and see what happens (no backend → should fail somehow)
          await page.waitForTimeout(6000);
          const bodyText = await page.evaluate(() => document.body.innerText);
          if (bodyText.includes("composing") || bodyText.includes("editor is reading")) {
            // Stuck in composing state — bad if it never finishes
            await page.waitForTimeout(8000);
            const stillComposing = (await page.evaluate(() => document.body.innerText)).includes("composing");
            if (stillComposing) fail("/try HANGS in 'composing' state forever — SSE call to missing backend doesn't time out");
            else pass("/try composing eventually resolves");
          } else if (bodyText.includes("problem at the press") || bodyText.includes("error") || bodyText.includes("Try again")) {
            pass("/try submit shows graceful error");
          } else if (bodyText.includes("Today's lede") || bodyText.includes("editor pick")) {
            pass("/try generated a brief (somehow)");
          } else {
            fail("/try unexpected state after submit", bodyText.slice(0, 120));
          }
        }
      }
    } finally { await ctx.close(); }
  }

  // ─── TEST 4: Nav drawer open + click links ─────────────────────────
  console.log("\n— Nav drawer open + navigation");
  {
    const { ctx, page } = await loadPage(browser, "/");
    try {
      const trigger = page.locator('.nav-trigger');
      const triggerVisible = await trigger.isVisible().catch(() => false);
      triggerVisible ? pass("nav trigger visible") : fail("nav trigger missing");
      if (triggerVisible) {
        await trigger.click();
        await page.waitForTimeout(400);
        const drawer = await page.locator('.nav-drawer').isVisible().catch(() => false);
        drawer ? pass("nav drawer opens") : fail("nav drawer didn't open after click");
        if (drawer) {
          // Click a link inside the drawer
          await page.locator('.nav-link:has-text("Manifesto")').first().click().catch(() => {});
          await page.waitForTimeout(1500);
          const onManifesto = page.url().includes("/manifesto");
          onManifesto ? pass("nav drawer link navigates to /manifesto") : fail("nav drawer link didn't navigate", page.url());
        }
      }
    } finally { await ctx.close(); }
  }

  // ─── TEST 5: Footer links work ─────────────────────────────────────
  console.log("\n— Footer link click-through");
  {
    const { ctx, page } = await loadPage(browser, "/");
    try {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
      const links = await page.evaluate(() => {
        const anchors = [...document.querySelectorAll("footer a[href]")];
        return anchors.map((a) => ({ href: a.getAttribute("href"), text: a.innerText.trim() }));
      });
      pass("footer links found", `${links.length} anchors`);
      for (const link of links.slice(0, 8)) {
        if (link.href?.startsWith("/")) {
          const resp = await page.goto(`${URL}${link.href}`, { timeout: 15_000 }).catch((e) => ({ ok: () => false, error: e.message }));
          if (resp.ok && resp.ok()) pass(`footer → ${link.href}`, link.text);
          else fail(`footer → ${link.href}`, `status=${resp.status?.() || "?"}`);
          await page.goto(URL, { waitUntil: "networkidle" });
        }
      }
    } finally { await ctx.close(); }
  }

  // ─── TEST 6: Auth-gated routes redirect/render gracefully ──────────
  console.log("\n— Auth-gated routes");
  for (const path of ["/account", "/saved", "/archive", "/search", "/admin", "/streak", "/referrals"]) {
    const { ctx, page, consoleErrors } = await loadPage(browser, path);
    try {
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 600));
      // Should NOT hang on a shimmer forever; should NOT show ugly errors
      if (bodyText.includes("Sign in") || bodyText.includes("sign in") || bodyText.includes("static demo") || bodyText.includes("unavailable")) {
        pass(`${path} graceful auth redirect or static-mode message`);
      } else if (bodyText.includes("404") || bodyText.includes("not found")) {
        pass(`${path} 404 page (acceptable)`);
      } else if (bodyText.length < 200) {
        fail(`${path} possibly blank or hanging`, bodyText.slice(0, 100));
      } else {
        pass(`${path} renders something`, `${bodyText.length} chars`);
      }
      if (consoleErrors.length > 2) fail(`${path} too many console errors`, `${consoleErrors.length}: ${consoleErrors[0].slice(0, 80)}`);
    } finally { await ctx.close(); }
  }

  // ─── TEST 7: Teaser pages ──────────────────────────────────────────
  console.log("\n— Cross-publication teaser pages");
  for (const path of ["/finance", "/design", "/ai-research", "/cybersecurity-weekly"]) {
    const { ctx, page } = await loadPage(browser, path);
    try {
      const masthead = await page.locator(".masthead-title").isVisible();
      masthead ? pass(`${path} renders teaser`) : fail(`${path} missing`);
    } finally { await ctx.close(); }
  }

  // ─── TEST 8: Keyboard shortcuts ────────────────────────────────────
  console.log("\n— Keyboard shortcuts");
  {
    const { ctx, page } = await loadPage(browser, "/");
    try {
      // Press "?" to open help overlay
      await page.keyboard.press("Shift+/");
      await page.waitForTimeout(400);
      const helpOpen = await page.locator('.shortcuts-card').isVisible().catch(() => false);
      helpOpen ? pass("'?' opens shortcuts cheat sheet") : fail("'?' didn't open cheat sheet");
      // Close with Escape
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const helpClosed = !(await page.locator('.shortcuts-card').isVisible().catch(() => false));
      helpClosed ? pass("Escape closes cheat sheet") : fail("Escape didn't close cheat sheet");
      // g + h → home (we're already there, test g + d)
      await page.keyboard.press("g");
      await page.keyboard.press("d");
      await page.waitForTimeout(1500);
      const url = page.url();
      url.includes("/demo") ? pass("'g d' navigates to /demo") : fail("'g d' didn't navigate", url);
    } finally { await ctx.close(); }
  }

  // ─── TEST 9: /edition/:slug behavior (no real slug exists) ─────────
  console.log("\n— /edition/:slug behavior");
  {
    const { ctx, page } = await loadPage(browser, "/edition/nonexistent-slug-xyz");
    try {
      await page.waitForTimeout(3000);
      const bodyText = await page.evaluate(() => document.body.innerText);
      // Should show error or "not found", not hang on a loading state
      const hasError = bodyText.includes("not found") || bodyText.includes("Couldn't") || bodyText.includes("problem at the press") || bodyText.includes("unavailable");
      const stillLoading = bodyText.length < 200;
      hasError ? pass("/edition/:slug shows error for nonexistent slug")
        : stillLoading ? fail("/edition/:slug HANGS on missing slug", `${bodyText.length} chars`)
        : pass("/edition/:slug renders something", bodyText.slice(0, 80));
    } finally { await ctx.close(); }
  }

  // ─── TEST 10: /unsubscribe ─────────────────────────────────────────
  console.log("\n— /unsubscribe");
  {
    const { ctx, page } = await loadPage(browser, "/unsubscribe?t=fake-token");
    try {
      await page.waitForTimeout(2000);
      const bodyText = await page.evaluate(() => document.body.innerText);
      bodyText.length > 100 ? pass("/unsubscribe renders something", bodyText.slice(0, 80)) : fail("/unsubscribe blank");
    } finally { await ctx.close(); }
  }

  // ─── TEST 11: All footer links across the landing page ────────────
  console.log("\n— Internal navigation between key pages");
  for (const from of ["/", "/demo", "/showcase"]) {
    const { ctx, page } = await loadPage(browser, from);
    try {
      const internalLinks = await page.evaluate(() => {
        const anchors = [...document.querySelectorAll("a[href^='/']")];
        return [...new Set(anchors.map((a) => a.getAttribute("href")))].filter((h) => h && !h.startsWith("/#"));
      });
      pass(`${from} has ${internalLinks.length} internal links`);
    } finally { await ctx.close(); }
  }

  // ─── TEST 12: Mobile drawer ─────────────────────────────────────────
  console.log("\n— Mobile drawer");
  {
    const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await mobileCtx.newPage();
    await page.goto(`${URL}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const trigger = page.locator('.nav-trigger');
    const tv = await trigger.isVisible();
    tv ? pass("mobile nav trigger visible") : fail("mobile nav trigger missing");
    if (tv) {
      await trigger.click();
      await page.waitForTimeout(400);
      const drawer = await page.locator('.nav-drawer').isVisible().catch(() => false);
      drawer ? pass("mobile drawer opens") : fail("mobile drawer didn't open");
    }
    await mobileCtx.close();
  }

  await browser.close();

  const pass_n = results.filter((r) => r.ok).length;
  const fail_n = results.filter((r) => !r.ok).length;
  console.log("\n" + "=".repeat(60));
  console.log(`PASS: ${pass_n}    FAIL: ${fail_n}`);
  if (fail_n > 0) {
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
