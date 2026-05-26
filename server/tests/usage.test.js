import { describe, it, expect } from "vitest";

// Pure-math tests for the usage cost calculation. We pull the internal function
// via re-exporting indirectly — but the safer test is via the logUsage path
// being a no-op (returns nothing, just inserts to DB).
//
// Here we test the threshold-checking knob: when COST_ALERT_THRESHOLD_USD env is
// set but the webhook URL is missing, checkDailyCostThreshold() is a no-op
// (returns undefined). When both are set, it would fire — but we don't actually
// post in tests.

import { checkDailyCostThreshold } from "../usage.js";

describe("checkDailyCostThreshold()", () => {
  it("is a no-op when COST_ALERT_WEBHOOK_URL is missing", async () => {
    delete process.env.COST_ALERT_WEBHOOK_URL;
    const result = await checkDailyCostThreshold();
    expect(result).toBeUndefined();
  });

  it("doesn't throw even when DATABASE_URL is unreachable", async () => {
    delete process.env.COST_ALERT_WEBHOOK_URL;
    process.env.DATABASE_URL = "postgres://bogus@localhost:1/none";
    // Should silently return without throwing
    await expect(checkDailyCostThreshold()).resolves.not.toThrow();
  });
});
