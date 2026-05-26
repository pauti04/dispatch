import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const briefSource = readFileSync(resolve(__dirname, "../brief.js"), "utf-8");

// These tests assert the SHAPE of the editor-voice prompt — they don't call OpenAI.
// They catch regressions where someone weakens the voice rules accidentally.
//
// The prompt's voice contract is the most valuable single asset of the product;
// these tests make it impossible to silently delete the rules.

describe("editor voice prompt contract", () => {
  it("declares the 'No exclamation marks. Ever.' rule", () => {
    expect(briefSource).toMatch(/No exclamation marks\.\s*Ever\./i);
  });

  it("bans LinkedIn-isms", () => {
    expect(briefSource).toMatch(/thrilled to share|humbled to announce|passionate about/i);
  });

  it("bans the worst marketing words", () => {
    const required = ["revolutionary", "game-changing", "stunning", "transformative", "cutting-edge"];
    for (const word of required) {
      expect(briefSource).toContain(word);
    }
  });

  it("includes at least 5 BAD/GOOD voice pair examples", () => {
    const badCount = (briefSource.match(/^\s*BAD:/gm) || []).length;
    const goodCount = (briefSource.match(/^\s*GOOD:/gm) || []).length;
    expect(badCount).toBeGreaterThanOrEqual(5);
    expect(goodCount).toBeGreaterThanOrEqual(5);
    expect(goodCount).toBeGreaterThanOrEqual(badCount); // every BAD needs a GOOD
  });

  it("requires editor_note to name a specific story (not abstract category)", () => {
    expect(briefSource).toMatch(/MUST name at least one specific story by subject/i);
  });

  it("enforces minimum breadth (at least 5 stories, at least 2 sections)", () => {
    expect(briefSource).toMatch(/at least 5 stories total/i);
    expect(briefSource).toMatch(/at least 2 sections/i);
  });

  it("declares The Editor's Take field with anti-hedging guidance", () => {
    expect(briefSource).toMatch(/The Editor's Take|"take":/i);
    expect(briefSource).toMatch(/Take a side\.?\s*Don't hedge/i);
  });

  it("requires JSON-only output (no markdown fences)", () => {
    expect(briefSource).toMatch(/Output ONLY valid JSON/i);
  });
});
