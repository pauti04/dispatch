import { describe, it, expect } from "vitest";
import { canonicalUrl } from "../sources.js";

describe("canonicalUrl()", () => {
  it("strips UTM and ref tracking params", () => {
    expect(
      canonicalUrl("https://example.com/post?utm_source=hn&utm_medium=referral&ref=twitter&id=42")
    ).toBe("example.com/post?id=42");
  });

  it("normalizes www. host prefix", () => {
    expect(canonicalUrl("https://www.example.com/post")).toBe("example.com/post");
    expect(canonicalUrl("https://example.com/post")).toBe("example.com/post");
  });

  it("strips trailing slash and /index.html", () => {
    expect(canonicalUrl("https://example.com/page/")).toBe("example.com/page");
    expect(canonicalUrl("https://example.com/page/index.html")).toBe("example.com/page");
    expect(canonicalUrl("https://example.com/page/index.htm")).toBe("example.com/page");
  });

  it("lowercases host but preserves path case", () => {
    expect(canonicalUrl("https://Example.COM/Path/Page")).toBe("example.com/Path/Page");
  });

  it("returns the same canonical form for HN-shared, GitHub-trending, and Lobsters versions of the same URL", () => {
    const a = canonicalUrl("https://example.com/post?utm_source=hn");
    const b = canonicalUrl("https://www.example.com/post?utm_source=lobsters");
    const c = canonicalUrl("https://example.com/post/");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("handles malformed URLs gracefully (no throw, returns lowercased input)", () => {
    expect(canonicalUrl("not a url")).toBe("not a url");
    expect(canonicalUrl("")).toBe("");
    expect(canonicalUrl(null)).toBe("");
    expect(canonicalUrl(undefined)).toBe("");
  });

  it("preserves query params that aren't tracking", () => {
    expect(canonicalUrl("https://example.com/search?q=hello&page=2")).toBe(
      "example.com/search?q=hello&page=2"
    );
  });
});
