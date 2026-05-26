import { chromium } from "playwright";

const URL = "https://dispatch-six-rho.vercel.app";
const browser = await chromium.launch({ headless: false });  // visible for debug
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

page.on("console", (msg) => console.log(`[console ${msg.type()}]`, msg.text()));
page.on("pageerror", (e) => console.log(`[pageerror]`, e.message));
page.on("response", (r) => { if (r.status() >= 400) console.log(`[${r.status()}]`, r.url()); });

await page.goto(`${URL}/try`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

console.log("\nInitial page state:");
const initial = await page.evaluate(() => ({
  url: window.location.pathname,
  hasOnboarding: !!document.querySelector('[class*="onboarding"]') || document.body.innerText.includes("Who's reading"),
  roleButtons: [...document.querySelectorAll('button')].filter(b => /Software Engineer|CS Student|ML Engineer/.test(b.innerText)).length,
  bodyTextStart: document.body.innerText.slice(0, 500),
}));
console.log(JSON.stringify(initial, null, 2));

console.log("\nClicking Software Engineer button...");
await page.locator('button:has-text("Software Engineer")').first().click();
await page.waitForTimeout(2000);

console.log("\nAfter click state:");
const afterClick = await page.evaluate(() => ({
  url: window.location.pathname,
  visibleSkillButtons: [...document.querySelectorAll('button')].filter(b => /Intermediate|Beginner|Advanced/.test(b.innerText)).length,
  visibleRoleButtons: [...document.querySelectorAll('button')].filter(b => /Software Engineer|CS Student/.test(b.innerText)).length,
  bodyText: document.body.innerText.slice(0, 800),
}));
console.log(JSON.stringify(afterClick, null, 2));

await page.waitForTimeout(3000);
await browser.close();
