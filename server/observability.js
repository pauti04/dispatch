// Wave N Day 1 — server-side Sentry + PostHog wiring.
// All exports are safe to call without the corresponding env vars; they become silent no-ops
// so dev / preview environments don't error out.

import * as Sentry from "@sentry/node";
import { PostHog } from "posthog-node";

const SENTRY_DSN = process.env.SENTRY_DSN;
const POSTHOG_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

let sentryInitialized = false;
let posthog = null;

export function initObservability() {
  if (SENTRY_DSN && !sentryInitialized) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      release: process.env.RELEASE || undefined,
      tracesSampleRate: 0.1,
      // Don't capture noise from intentional rejections
      ignoreErrors: ["AbortError", "ECONNRESET"],
    });
    sentryInitialized = true;
    console.log("sentry: initialized");
  }
  if (POSTHOG_KEY && !posthog) {
    posthog = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      flushAt: 20,
      flushInterval: 30000,
    });
    console.log("posthog: initialized");
  }
}

/* ─── Sentry helpers ──────────────────────────────────────── */

export function captureError(err, context = {}) {
  if (!sentryInitialized) {
    // In dev, just log it
    console.error("[capture]", err?.message || err, context);
    return;
  }
  try {
    Sentry.withScope((scope) => {
      for (const [k, v] of Object.entries(context)) {
        scope.setTag(k, String(v).slice(0, 100));
      }
      Sentry.captureException(err);
    });
  } catch {}
}

export function setUserContext({ id, email }) {
  if (!sentryInitialized) return;
  try {
    Sentry.setUser({ id: String(id || ""), email: email || undefined });
  } catch {}
}

export function clearUserContext() {
  if (!sentryInitialized) return;
  try {
    Sentry.setUser(null);
  } catch {}
}

/* ─── PostHog helpers ─────────────────────────────────────── */

/**
 * Capture a server-side analytics event. Always tied to a distinct_id; pass userId when
 * known, otherwise pass a stable anonymous id (e.g. request IP hash) or "system" for cron events.
 */
export function track(distinctId, event, props = {}) {
  if (!posthog) return;
  try {
    posthog.capture({
      distinctId: String(distinctId || "system"),
      event,
      properties: props,
    });
  } catch {}
}

export function identify(distinctId, traits = {}) {
  if (!posthog || !distinctId) return;
  try {
    posthog.identify({ distinctId: String(distinctId), properties: traits });
  } catch {}
}

export async function flush() {
  if (!posthog) return;
  try {
    await posthog.shutdown();
  } catch {}
}

/* ─── Event name registry ─────────────────────────────────── */
export const events = {
  CRON_RUN: "cron_run",
  CRON_USER_FAILED: "cron_user_failed",
  BRIEF_GENERATED: "brief_generated",
  BRIEF_GENERATION_FAILED: "brief_generation_failed",
  WELCOME_EMAIL_SENT: "welcome_email_sent",
  COST_THRESHOLD_BREACHED: "cost_threshold_breached",
  SIGNUP_VERIFIED: "signup_verified",
  ACCOUNT_DELETED: "account_deleted",
};

export { Sentry };
