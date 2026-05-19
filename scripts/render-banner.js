// Render the GitHub social-preview banner (1280×640) from scripts/banner.html.
// Output: screenshots/banner.png (2x DPI so it looks crisp on retina).

import { chromium } from "playwright";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const HTML_PATH = resolve(process.cwd(), "scripts/banner.html");
const OUT_PATH = resolve(process.cwd(), "screenshots/banner.png");

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 640 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(pathToFileURL(HTML_PATH).href, { waitUntil: "networkidle" });
await page.waitForTimeout(800); // let fonts settle
await page.screenshot({ path: OUT_PATH, fullPage: false });
await browser.close();
console.log(`✓ banner saved to ${OUT_PATH}`);
