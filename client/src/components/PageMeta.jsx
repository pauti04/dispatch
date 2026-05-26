import { useEffect } from "react";

const SITE_BRAND = "Dispatch · Tech";
const DEFAULT_TITLE = "Dispatch · Tech — the morning paper for working developers";
const DEFAULT_DESCRIPTION =
  "The morning paper for working developers — written by an editor that actually read this week's wires. Five minutes, your beats, free.";

function setMeta(selector, attr, value) {
  if (value == null) return null;
  const el = document.head.querySelector(selector);
  if (!el) return null;
  const prev = el.getAttribute(attr);
  el.setAttribute(attr, value);
  return () => {
    if (prev != null) el.setAttribute(attr, prev);
  };
}

function setOrCreateLink(rel, href) {
  if (!href) return null;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  let created = false;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
    created = true;
  }
  const prev = el.getAttribute("href");
  el.setAttribute("href", href);
  return () => {
    if (created) el.remove();
    else if (prev != null) el.setAttribute("href", prev);
  };
}

/**
 * Set per-page document.title + meta description + Open Graph + Twitter tags.
 *
 * - `title` becomes `"<title> — Dispatch · Tech"` in the browser tab, with the
 *   raw title used for OG/Twitter so social previews are clean.
 * - `description` overrides the site default for meta + OG + Twitter.
 * - Canonical URL is built from the current pathname so each route has its own.
 *
 * Restores the previous values on unmount so React Router back-nav doesn't
 * leave a stale title.
 */
export default function PageMeta({ title, description }) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_BRAND}` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    const ogTitle = title || DEFAULT_TITLE;

    const prevTitle = document.title;
    document.title = fullTitle;

    const restores = [
      setMeta('meta[name="description"]', "content", desc),
      setMeta('meta[property="og:title"]', "content", ogTitle),
      setMeta('meta[property="og:description"]', "content", desc),
      setMeta('meta[name="twitter:title"]', "content", ogTitle),
      setMeta('meta[name="twitter:description"]', "content", desc),
      setOrCreateLink(
        "canonical",
        typeof window !== "undefined" ? window.location.origin + window.location.pathname : null
      ),
      setOrCreateLink(
        "og:url" // also set og:url meta below; this is a no-op for unknown rel
      ),
      setMeta(
        'meta[property="og:url"]',
        "content",
        typeof window !== "undefined" ? window.location.origin + window.location.pathname : null
      ),
    ].filter(Boolean);

    return () => {
      document.title = prevTitle;
      for (const restore of restores) {
        try {
          restore();
        } catch {}
      }
    };
  }, [title, description]);

  return null;
}
