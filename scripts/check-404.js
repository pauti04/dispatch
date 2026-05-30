// Verify React Router's catch-all renders NotFound, not Landing.
// SPA returns HTTP 200 for unknown URLs (correct — Vercel rewrites all to
// index.html); the verification is that the rendered DOM shows the 404 page.
import { chromium } from "playwright";

const URL = process.env.URL || "https://dispatch-six-rho.vercel.app";
const CASES = [
  "/asdf",
  "/no-such-page",
  "/random/nested/path/here",
  "/account/extra/segments",
  "/edition/", // trailing slash with no slug
];

const browser = await chromium.launch();
console.log(`404 verification on ${URL}\n`);

let allPass = true;
for (const path of CASES) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${URL}${path}`, { waitUntil: "networkidle", timeout: 15_000 });
  await page.waitForTimeout(400);
  const title = await page.title();
  const body = await page.evaluate(() => document.body.innerText || "");
  const is404 =
    title.includes("404") ||
    body.includes("404") ||
    body.includes("Page not found") ||
    body.includes("gone to press elsewhere");
  const isLanding = body.includes("Reading HackerNews is a part-time job");
  const ok = is404 && !isLanding;
  if (!ok) allPass = false;
  console.log(
    `${ok ? "✓" : "✗"} ${path.padEnd(36)} title=${title.slice(0, 40).padEnd(40)} 404=${is404 ? "Y" : "·"} landing=${isLanding ? "Y" : "·"}`
  );
  await ctx.close();
}

await browser.close();
process.exit(allPass ? 0 : 1);
