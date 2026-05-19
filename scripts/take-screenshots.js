// One-off screenshot capture for the README + /showcase page.
// Run with: node scripts/take-screenshots.js
// Requires playwright (already installed) + dev server + client at :5173.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.SCREENSHOT_BASE || "http://localhost:5173";
const OUT_DIR = resolve(process.cwd(), "screenshots");
mkdirSync(OUT_DIR, { recursive: true });

const shots = [
  { name: "01-landing.png",       path: "/",          viewport: { width: 1440, height: 900 }, wait: 800,  full: false },
  { name: "02-landing-anatomy.png",path: "/",         viewport: { width: 1440, height: 900 }, wait: 1200, full: false, scrollTo: 1900 },
  { name: "03-demo-annotated.png", path: "/demo",     viewport: { width: 1440, height: 900 }, wait: 1500, full: false },
  { name: "04-demo-callout.png",   path: "/demo",     viewport: { width: 1440, height: 900 }, wait: 2000, full: false, scrollTo: 700 },
  { name: "05-try-onboarding.png", path: "/try",      viewport: { width: 1440, height: 900 }, wait: 800,  full: false },
  { name: "06-manifesto.png",      path: "/manifesto",viewport: { width: 1440, height: 900 }, wait: 600,  full: false },
  { name: "07-press-kit.png",      path: "/press",    viewport: { width: 1440, height: 900 }, wait: 600,  full: false },
  { name: "08-changelog.png",      path: "/changelog",viewport: { width: 1440, height: 900 }, wait: 600,  full: false },
  { name: "09-landing-mobile.png", path: "/",         viewport: { width: 390,  height: 844 }, wait: 800,  full: false },
  { name: "10-demo-mobile.png",    path: "/demo",     viewport: { width: 390,  height: 844 }, wait: 1500, full: false },
];

async function capture() {
  const browser = await chromium.launch();
  for (const shot of shots) {
    const ctx = await browser.newContext({ viewport: shot.viewport, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForTimeout(shot.wait);
      if (shot.scrollTo) await page.evaluate((y) => window.scrollTo(0, y), shot.scrollTo);
      await page.waitForTimeout(400);
      const out = resolve(OUT_DIR, shot.name);
      await page.screenshot({ path: out, fullPage: !!shot.full });
      console.log(`✓ ${shot.name}  (${shot.viewport.width}x${shot.viewport.height})`);
    } catch (err) {
      console.warn(`✗ ${shot.name}  ${err.message}`);
    } finally {
      await ctx.close();
    }
  }
  await browser.close();
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
