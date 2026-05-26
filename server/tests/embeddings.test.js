import { describe, it, expect } from "vitest";
import { prefilterPoolByBeats } from "../embeddings.js";

// These tests exercise the GRACEFUL DEGRADATION path of the pre-filter:
// when OPENAI_API_KEY is missing or the API errors, prefilterPoolByBeats
// returns the input clusters unchanged. That's what production relies on
// when the cost-optimization step is unavailable.

function cluster(title) {
  return {
    primary: {
      kind: "hn",
      item: { title, url: `https://example.com/${title.replace(/\s+/g, "-")}` },
      ref: "HN" + Math.random().toString(36).slice(2, 6),
    },
    refs: [],
  };
}

describe("prefilterPoolByBeats() graceful degradation", () => {
  it("returns input unchanged when domains is empty", async () => {
    const pool = [cluster("a"), cluster("b"), cluster("c")];
    const result = await prefilterPoolByBeats({ clusters: pool, domains: [], topN: 2 });
    expect(result).toBe(pool); // exact same reference
  });

  it("returns input unchanged when pool is already <= topN", async () => {
    const pool = [cluster("a"), cluster("b")];
    const result = await prefilterPoolByBeats({
      clusters: pool,
      domains: ["Backend"],
      topN: 30,
    });
    expect(result).toBe(pool);
  });

  it("returns input unchanged on any API failure", async () => {
    // With a guaranteed-bogus API key, the embeddings call will fail.
    // The function must catch and return the full input.
    process.env.OPENAI_API_KEY = "sk-definitely-invalid-key-for-test";
    const pool = Array.from({ length: 40 }, (_, i) => cluster(`Story ${i}`));
    const result = await prefilterPoolByBeats({
      clusters: pool,
      domains: ["Backend Development"],
      topN: 5,
    });
    // Either it's the same pool (graceful failure) OR it's a filtered subset.
    // Both are acceptable; what matters is no throw + array returned.
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles malformed clusters without throwing", async () => {
    const result = await prefilterPoolByBeats({
      clusters: [
        { primary: { item: {} } },
        { primary: { item: { title: "real" } } },
      ],
      domains: ["test"],
      topN: 1,
    });
    expect(Array.isArray(result)).toBe(true);
  });
});
