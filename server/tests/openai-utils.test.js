import { describe, it, expect } from "vitest";
import { withTimeout, callOpenAIWithRetry, TimeoutError } from "../openai-utils.js";

describe("withTimeout()", () => {
  it("resolves when the promise finishes within the budget", async () => {
    const result = await withTimeout(Promise.resolve("ok"), 1000);
    expect(result).toBe("ok");
  });

  it("rejects with TimeoutError when the promise exceeds the budget", async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve("late"), 200));
    await expect(withTimeout(slow, 50)).rejects.toThrow(TimeoutError);
  });

  it("forwards real rejections from the wrapped promise", async () => {
    const failing = Promise.reject(new Error("real failure"));
    await expect(withTimeout(failing, 100)).rejects.toThrow("real failure");
  });
});

describe("callOpenAIWithRetry()", () => {
  it("returns the first-attempt result when successful", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      return "result";
    };
    const result = await callOpenAIWithRetry(fn, { timeoutMs: 100, endpoint: "test" });
    expect(result).toBe("result");
    expect(calls).toBe(1);
  });

  it("does NOT retry on non-transient errors (e.g. 400 bad request)", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      const err = new Error("bad request");
      err.status = 400;
      throw err;
    };
    await expect(
      callOpenAIWithRetry(fn, { timeoutMs: 100, endpoint: "test" })
    ).rejects.toThrow("bad request");
    expect(calls).toBe(1);
  });

  it("retries once on transient errors (5xx, ECONN, timeout)", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls === 1) {
        const err = new Error("server error");
        err.status = 503;
        throw err;
      }
      return "ok after retry";
    };
    const result = await callOpenAIWithRetry(fn, { timeoutMs: 100, endpoint: "test" });
    expect(result).toBe("ok after retry");
    expect(calls).toBe(2);
  });

  it("retries on rate-limit 429", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls === 1) {
        const err = new Error("rate limit");
        err.status = 429;
        throw err;
      }
      return "ok";
    };
    const result = await callOpenAIWithRetry(fn, { timeoutMs: 100, endpoint: "test" });
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });

  it("gives up after exactly one retry (max 2 attempts total)", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      const err = new Error("always fails");
      err.status = 503;
      throw err;
    };
    await expect(
      callOpenAIWithRetry(fn, { timeoutMs: 100, endpoint: "test" })
    ).rejects.toThrow("always fails");
    expect(calls).toBe(2);
  });

  it("retries on TimeoutError specifically", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls === 1) {
        return new Promise((resolve) => setTimeout(() => resolve("late"), 500));
      }
      return "fast";
    };
    const result = await callOpenAIWithRetry(fn, { timeoutMs: 30, endpoint: "test" });
    expect(result).toBe("fast");
    expect(calls).toBe(2);
  });
});
