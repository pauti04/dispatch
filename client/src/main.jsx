import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.jsx";
import "./index.css";
import { initAnalytics, captureUTMs } from "./lib/analytics.js";

// Wave N Day 1 — Sentry (client) + PostHog (client) + UTM capture.
// All three are no-ops without the corresponding env vars, so dev stays clean.

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_RELEASE || undefined,
    tracesSampleRate: 0.1,
    // Drop common noise we don't care about
    ignoreErrors: ["AbortError", "ResizeObserver loop limit exceeded"],
  });
}

// First-touch UTM capture — runs before initial render so the values are there
// for signup. PostHog also reads from the same query params on its own.
captureUTMs();
initAnalytics();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA: register service worker in production only (avoids dev caching headaches).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
