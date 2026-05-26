// Track step-by-step state in OnboardingFlow
import { chromium } from "playwright";

const URL = "https://dispatch-six-rho.vercel.app";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// Track localStorage state
await page.goto(`${URL}/try`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

const before = await page.evaluate(() => ({
  localStorage_keys: Object.keys(localStorage),
  localStorage_prefs: localStorage.getItem("dispatch.prefs.v2"),
  visibleStep: document.querySelector('.eyebrow')?.innerText,
  bodyStart: document.body.innerText.slice(0, 200),
}));
console.log("BEFORE CLICK:", JSON.stringify(before, null, 2));

// Look for all the buttons we'll consider clicking
const allButtons = await page.evaluate(() =>
  [...document.querySelectorAll('button')]
    .filter(b => /Software Engineer|Next|ML Engineer/.test(b.innerText))
    .map(b => ({ text: b.innerText.replace(/\s+/g, " ").trim().slice(0, 60), classes: b.className }))
);
console.log("\nMATCHING BUTTONS:", JSON.stringify(allButtons, null, 2));

// Click "Software Engineer" specifically (the role card)
console.log("\n>>> Clicking 'Software Engineer'");
await page.locator('button:has-text("Software Engineer")').first().click();
await page.waitForTimeout(800);

const afterRoleClick = await page.evaluate(() => ({
  visibleStep: document.querySelector('.eyebrow')?.innerText,
  bodyStart: document.body.innerText.slice(0, 200),
  hasNextButton: !!document.querySelector('button.btn-primary'),
  nextButtonText: document.querySelector('button.btn-primary')?.innerText,
}));
console.log("AFTER ROLE CLICK:", JSON.stringify(afterRoleClick, null, 2));

// Now click "Next →" to advance
console.log("\n>>> Clicking 'Next →'");
const nextBtn = page.locator('button:has-text("Next")').first();
if (await nextBtn.isVisible().catch(() => false)) {
  await nextBtn.click();
  await page.waitForTimeout(800);
  const afterNext = await page.evaluate(() => ({
    visibleStep: document.querySelector('.eyebrow')?.innerText,
    bodyStart: document.body.innerText.slice(0, 200),
  }));
  console.log("AFTER NEXT:", JSON.stringify(afterNext, null, 2));
} else {
  console.log("'Next' button not visible after role click");
}

await browser.close();
