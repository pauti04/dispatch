// Wave N — analytics helpers.
// PostHog client + a tiny UTM-capture layer that persists referral attribution into
// localStorage on first visit and includes it when the user signs up.
//
// Wave N+ polish — PostHog is dynamically imported so its ~70KB only loads when
// the first track() call fires. The library is also no-op when VITE_POSTHOG_KEY
// is missing (dev / preview).
//
// All callsites should use `track(event, props)` instead of touching posthog directly.

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

let posthog = null;
let initPromise = null;
let queue = []; // events queued while PostHog is loading

async function ensureInit() {
  if (!POSTHOG_KEY) return null;
  if (posthog) return posthog;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const mod = await import("posthog-js");
    const ph = mod.default || mod;
    ph.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      autocapture: false, // We track events explicitly.
      persistence: "localStorage+cookie",
      person_profiles: "identified_only",
      disable_session_recording: true,
    });
    posthog = ph;
    // Drain queued events
    for (const [event, props] of queue) {
      try { ph.capture(event, props); } catch {}
    }
    queue = [];
    return ph;
  })();
  return initPromise;
}

export function initAnalytics() {
  // Kick off the dynamic import but don't block — first event will await it.
  ensureInit();
}

export function track(event, props = {}) {
  if (!POSTHOG_KEY) return;
  if (!posthog) {
    queue.push([event, props]);
    ensureInit();
    return;
  }
  try {
    posthog.capture(event, props);
  } catch {
    // never let analytics break the app
  }
}

export async function identify(userId, traits = {}) {
  if (!POSTHOG_KEY || !userId) return;
  const ph = await ensureInit();
  if (!ph) return;
  try {
    ph.identify(userId, traits);
  } catch {}
}

export async function resetIdentity() {
  if (!POSTHOG_KEY) return;
  const ph = await ensureInit();
  if (!ph) return;
  try {
    ph.reset();
  } catch {}
}

/* ─── UTM capture ──────────────────────────────────────────────
   On every page load with utm_* query params, we stash the first-touch
   attribution in localStorage. When the user signs up, we send those
   values along so the server can persist them on the user row. */

const UTM_STORAGE_KEY = "dispatch.utm.v1";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"];

export function captureUTMs() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const captured = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) captured[k] = v.slice(0, 100);
    }
    if (!Object.keys(captured).length) return;
    // First-touch: don't overwrite existing attribution.
    const existing = localStorage.getItem(UTM_STORAGE_KEY);
    if (existing) return;
    localStorage.setItem(
      UTM_STORAGE_KEY,
      JSON.stringify({ ...captured, captured_at: new Date().toISOString() })
    );
  } catch {}
}

export function getStoredUTMs() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ─── Event name registry ──────────────────────────────────────
   Keep the names here so callsites don't typo them. */
export const events = {
  SIGNUP_REQUESTED: "signup_requested",
  SIGNUP_VERIFIED: "signup_verified",
  BRIEF_GENERATED: "brief_generated",
  BRIEF_OPENED: "brief_opened",
  STORY_CLICKED: "story_clicked",
  BOOKMARK_ADDED: "bookmark_added",
  DEMO_VIEWED: "demo_viewed",
};
