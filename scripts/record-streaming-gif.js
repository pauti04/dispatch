// Record a tight ~10s animated GIF of the live streaming brief generation.
//
// Strategy: open /try, click through the 3 onboarding steps fast, submit,
// then capture the streaming → brief-reveal moment. Trim + accelerate to ~10s.
//
// Output: screenshots/streaming.gif (target: <1 MB, ~10s, 800px wide)

import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const OUT_DIR = resolve(process.cwd(), "screenshots");
const TMP = resolve(process.cwd(), ".gif-tmp");
mkdirSync(OUT_DIR, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

async function record() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1000, height: 640 },
    deviceScaleFactor: 1,
    recordVideo: { dir: TMP, size: { width: 1000, height: 640 } },
  });
  const page = await ctx.newPage();

  await page.goto(`${CLIENT_URL}/try`, { waitUntil: "networkidle", timeout: 20_000 });
  await page.waitForTimeout(1500); // intro frames

  // Step I: role
  console.log("step I — role");
  await page.click('button:has-text("Software Engineer")', { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);

  // Step II: skill
  console.log("step II — skill");
  await page.click('button:has-text("Intermediate")', { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);

  // Step III: domains — pick 4
  console.log("step III — domains");
  for (const d of ["Backend Development", "DevOps & Infra", "Developer Tools", "Open Source"]) {
    await page.click(`button:has-text("${d}")`, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(400);

  // Submit
  console.log("submit");
  await page.click('button:has-text("Show me today")', { timeout: 4000 })
    .catch(() => page.click('button.btn-primary:visible', { timeout: 4000 }).catch(() => {}));

  // Hold for the streaming + first reveal of the brief headline
  console.log("recording streaming…");
  await page.waitForTimeout(14_000);

  await ctx.close();
  await browser.close();

  const files = readdirSync(TMP).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error("no webm captured");
  const webm = join(TMP, files[0]);
  console.log(`webm captured: ${webm} (${(statSync(webm).size / 1024 / 1024).toFixed(2)} MB)`);

  // Speed up everything ~1.7x to fit ~22s of source into ~13s of output.
  // This makes the click-through feel snappy and the streaming feel fast.
  const sped = join(TMP, "sped.mp4");
  execSync(
    `ffmpeg -y -i "${webm}" -vf "setpts=0.58*PTS" -an "${sped}"`,
    { stdio: "inherit" }
  );

  const palette = join(TMP, "palette.png");
  const gif = join(OUT_DIR, "streaming.gif");

  execSync(
    `ffmpeg -y -i "${sped}" -vf "fps=10,scale=800:-1:flags=lanczos,palettegen=stats_mode=diff" "${palette}"`,
    { stdio: "inherit" }
  );
  execSync(
    `ffmpeg -y -i "${sped}" -i "${palette}" -filter_complex "fps=10,scale=800:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "${gif}"`,
    { stdio: "inherit" }
  );

  console.log(`✓ ${gif} (${(statSync(gif).size / 1024 / 1024).toFixed(2)} MB)`);
  rmSync(TMP, { recursive: true, force: true });
}

record().catch((err) => {
  console.error(err);
  process.exit(1);
});
