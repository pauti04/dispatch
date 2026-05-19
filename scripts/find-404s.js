// Capture every 404'ing URL when loading the deployed site.
import { chromium } from "playwright";

const URL = "https://dispatch-six-rho.vercel.app";

async function main() {
  const browser = await chromium.launch();
  for (const path of ["/", "/demo", "/showcase", "/about"]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const fourOhFours = [];
    page.on("response", (resp) => {
      if (resp.status() === 404) fourOhFours.push({ status: resp.status(), url: resp.url() });
    });
    await page.goto(`${URL}${path}`, { waitUntil: "networkidle", timeout: 25_000 });
    await page.waitForTimeout(1500);
    console.log(`\n${path}  (${fourOhFours.length} 404s):`);
    for (const r of fourOhFours) console.log(`  ${r.status}  ${r.url}`);
    await ctx.close();
  }
  await browser.close();
}
main().catch(console.error);
