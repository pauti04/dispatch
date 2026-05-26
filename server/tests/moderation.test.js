import { describe, it, expect } from "vitest";
import { shouldFilter, moderateClusters } from "../moderation.js";

function cluster(title, description = "", url = "https://example.com/post") {
  return {
    primary: {
      kind: "hn",
      item: { title, description, url },
      ref: "HN1",
    },
    refs: [],
  };
}

describe("shouldFilter()", () => {
  it("lets clean tech stories through", () => {
    expect(shouldFilter(cluster("Anthropic ships Claude SDK v2"))).toBe(false);
    expect(shouldFilter(cluster("Postgres 17 released"))).toBe(false);
    expect(shouldFilter(cluster("How we cut our Kubernetes bill by 80%"))).toBe(false);
  });

  it("filters when 2+ scam-pattern CATEGORIES hit (the 2-hit threshold)", () => {
    // Hits category 0 (presale) + category 1 (passive income) = 2 hits, filter
    expect(
      shouldFilter(cluster("100x gem presale — passive income for everyone"))
    ).toBe(true);
    // Hits category 0 (pump and dump) + category 2 (click here) = 2 hits, filter
    expect(
      shouldFilter(cluster("Pump and dump alert — click here for the truth"))
    ).toBe(true);
  });

  it("does NOT filter on a single category hit (false-negative bias)", () => {
    // Two phrases but BOTH from category 0 — counts as 1 hit
    expect(
      shouldFilter(cluster("100x gem presale — pump and dump opportunity"))
    ).toBe(false);
    // Single mention slips through
    expect(shouldFilter(cluster("Crypto presale platform announces audit results"))).toBe(false);
  });

  it("filters NSFW immediately on a single hit (different threshold)", () => {
    expect(shouldFilter(cluster("OnlyFans creator launches developer tool"))).toBe(true);
  });

  it("safely handles missing/null clusters", () => {
    expect(shouldFilter(null)).toBe(false);
    expect(shouldFilter(undefined)).toBe(false);
    expect(shouldFilter({})).toBe(false);
    expect(shouldFilter({ primary: {} })).toBe(false);
  });
});

describe("moderateClusters()", () => {
  it("returns kept + removed_count", () => {
    const pool = [
      cluster("Anthropic ships Claude SDK v2"),
      cluster("100x gem presale — passive income forever"), // hits 2 categories
      cluster("Postgres 17 released"),
    ];
    const { kept, removed_count } = moderateClusters(pool);
    expect(kept).toHaveLength(2);
    expect(removed_count).toBe(1);
  });

  it("empty pool returns empty kept + 0 removed", () => {
    const { kept, removed_count } = moderateClusters([]);
    expect(kept).toEqual([]);
    expect(removed_count).toBe(0);
  });
});
