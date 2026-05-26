import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto("https://dispatch-six-rho.vercel.app/discover", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: "/Users/pauti/demo use/dispatch/screenshots/11-discover.png", fullPage: false });
await browser.close();
console.log("done");
