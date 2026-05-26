// Check the REAL issues from the interactive test:
//   1. /signup form behavior in static-only mode
//   2. /saved, /archive, /streak, /referrals — show "UNAVAILABLE"; can we make it nicer?
//   3. /edition/:slug — hangs on missing slug
//   4. /referrals — multiple console errors
import { chromium } from "playwright";

const URL = "https://dispatch-six-rho.vercel.app";
const browser = await chromium.launch();

async function inspect(path, action) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  const requests404 = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 150)));
  page.on("response", (r) => r.status() === 404 && requests404.push(r.url().replace(URL, "")));
  await page.goto(`${URL}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  if (action) await action(page);
  await page.waitForTimeout(2500);
  const text = await page.evaluate(() => document.body.innerText);
  console.log(`\n=== ${path} ===`);
  console.log("body chars:", text.length);
  console.log("404 requests:", requests404);
  console.log("console errors:", errors.length);
  console.log("body slice:", text.slice(0, 400).replace(/\n+/g, " | "));
  await ctx.close();
}

await inspect("/signup", async (page) => {
  console.log("(filling email + submitting)");
  await page.locator('input[type="email"]').fill("test@example.com");
  await page.locator('button:has-text("Send")').first().click().catch(() => {});
});

await inspect("/saved");
await inspect("/archive");
await inspect("/streak");
await inspect("/referrals");
await inspect("/edition/nonexistent-test-slug");
await inspect("/account");

await browser.close();
