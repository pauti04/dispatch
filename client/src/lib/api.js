const API_BASE = import.meta.env.VITE_API_URL || "";

// Static-mode fallback — when VITE_API_URL is unset OR a fetch fails, the
// demo deploy falls back to a baked-in sample brief so /demo, /today, and the
// landing's "today's lede" banner stay functional without a backend.
const STATIC_FALLBACK = import.meta.env.VITE_STATIC_FALLBACK !== "false";

// Static-only mode: no API_BASE set + we're served by a non-localhost host =
// this is the unlisted demo deploy with no backend. In that mode every authed
// API call is short-circuited so the browser console stays clean and we can
// show a friendly "demo mode" message instead of raw JSON-parse errors.
//
// Calls that have a static fallback (sample, discover) still work; everything
// else rejects with err.staticOnly = true so page components can render a
// proper demo-mode notice instead of an ugly error.
export const IS_STATIC_ONLY =
  STATIC_FALLBACK &&
  !API_BASE &&
  typeof window !== "undefined" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname);

export function staticOnlyError(method = "this action") {
  const err = new Error(
    `${method} requires a Dispatch subscription. You're viewing the public demo.`
  );
  err.status = 501;
  err.staticOnly = true;
  return err;
}

function staticOnlyReject(method) {
  return Promise.reject(staticOnlyError(method));
}

/** Wrap an API call so it rejects with staticOnly error when in demo mode. */
function authed(method, fn) {
  return (...args) => (IS_STATIC_ONLY ? staticOnlyReject(method) : fn(...args));
}

async function request(path, opts = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    ...opts,
  });
  // Defensive: if a host rewrites unknown API routes to the SPA HTML, we'd get
  // HTTP 200 with content-type text/html. Detect that and treat as failure so
  // the static fallback in requestWithStaticFallback() can kick in.
  const ctype = r.headers.get("content-type") || "";
  if (!ctype.includes("application/json")) {
    const err = new Error(`expected JSON, got ${ctype || "no content-type"}`);
    err.status = r.status;
    throw err;
  }
  let data = null;
  try {
    data = await r.json();
  } catch {}
  if (!r.ok) {
    const err = new Error(data?.error || `HTTP ${r.status}`);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Try the API, fall back to a static JSON file under /public if it fails.
 * Used for the demo deploy where there's no backend.
 * In IS_STATIC_ONLY mode, skip the API call entirely and go straight to static.
 */
async function requestWithStaticFallback(apiPath, staticPath) {
  if (IS_STATIC_ONLY) {
    const r = await fetch(staticPath);
    if (!r.ok) throw new Error(`static fallback ${staticPath} ${r.status}`);
    return r.json();
  }
  try {
    return await request(apiPath);
  } catch (err) {
    if (!STATIC_FALLBACK) throw err;
    const r = await fetch(staticPath);
    if (!r.ok) throw err;
    return r.json();
  }
}

/**
 * Stream a brief from /api/brief/stream. Calls handlers as SSE events arrive.
 * In static-only mode, fires onError immediately so the page can render a
 * friendly demo-mode notice instead of hanging on the "composing" pane.
 */
export function streamBrief(body, { onDelta, onComplete, onError } = {}) {
  if (IS_STATIC_ONLY) {
    setTimeout(() => onError?.(staticOnlyError("streaming brief generation")), 0);
    return () => {};
  }
  const controller = new AbortController();
  (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/brief/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt.slice(0, 200)}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          let event = "message";
          let data = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) event = line.slice(7);
            else if (line.startsWith("data: ")) data += line.slice(6);
          }
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          if (event === "delta") onDelta?.(parsed.chunk || "");
          else if (event === "complete") onComplete?.(parsed);
          else if (event === "error") onError?.(new Error(parsed.message || "stream error"));
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") onError?.(err);
    }
  })();
  return () => controller.abort();
}

export const api = {
  // Public — work even in demo mode via static fallback
  sample: () => requestWithStaticFallback("/api/sample", "/sample-brief.json"),
  discoverThisWeek: () =>
    requestWithStaticFallback("/api/discover/this-week", "/discover.json"),
  streamBrief,

  // Authed / backend-only — short-circuit cleanly when demo mode
  brief: authed("brief", (body) =>
    request("/api/brief", { method: "POST", body: JSON.stringify(body) })
  ),
  authRequest: authed("subscribe", (body) =>
    request("/api/auth/request", { method: "POST", body: JSON.stringify(body) })
  ),
  authVerify: authed("verify", (token) =>
    request(`/api/auth/verify?token=${encodeURIComponent(token)}`)
  ),
  authLogout: authed("sign out", () => request("/api/auth/logout", { method: "POST" })),
  me: authed("account access", () => request("/api/me")),
  updateMe: authed("update account", (body) =>
    request("/api/me", { method: "PATCH", body: JSON.stringify(body) })
  ),
  deleteMe: authed("delete account", () => request("/api/me", { method: "DELETE" })),
  testSend: authed("test send", () => request("/api/me/test-send", { method: "POST" })),

  edition: authed("read edition", (slug, viewToken) =>
    request(`/api/editions/${slug}${viewToken ? `?t=${encodeURIComponent(viewToken)}` : ""}`)
  ),
  listEditions: authed("list editions", (before) =>
    request(`/api/editions${before ? `?before=${encodeURIComponent(before)}` : ""}`)
  ),
  teamShare: authed("team share", (slug) =>
    request(`/api/editions/${encodeURIComponent(slug)}/team-share`, { method: "POST" })
  ),
  forwardEdition: authed("forward", (slug, to_email) =>
    request(`/api/editions/${encodeURIComponent(slug)}/forward`, {
      method: "POST",
      body: JSON.stringify({ to_email }),
    })
  ),

  bookmarks: authed("bookmarks", () => request("/api/bookmarks")),
  addBookmark: authed("add bookmark", (body) =>
    request("/api/bookmarks", { method: "POST", body: JSON.stringify(body) })
  ),
  removeBookmark: authed("remove bookmark", (story_url) =>
    request(`/api/bookmarks?story_url=${encodeURIComponent(story_url)}`, { method: "DELETE" })
  ),
  setBookmarkVisibility: authed("set bookmark visibility", (story_url, is_public) =>
    request(`/api/bookmarks/visibility`, {
      method: "PATCH",
      body: JSON.stringify({ story_url, is_public }),
    })
  ),

  search: authed("search", (q) => request(`/api/me/search?q=${encodeURIComponent(q)}`)),
  unsubscribe: authed("unsubscribe", (token) =>
    request(`/api/unsubscribe?t=${encodeURIComponent(token)}`)
  ),

  myInvite: authed("invites", () => request("/api/invites/me")),
  inviteLeaderboard: authed("invite leaderboard", () => request("/api/invites/leaderboard")),
  inviteStats: authed("invite stats", () => request("/api/invites/stats")),

  skillsTrending: authed("skills trending", () => request("/api/me/skills-trending")),
  streak: authed("streak", () => request("/api/me/streak")),

  postLetter: authed("post letter", (slug, body) =>
    request(`/api/letters/${encodeURIComponent(slug)}`, {
      method: "POST",
      body: JSON.stringify({ body }),
    })
  ),
  listLetters: authed("list letters", (slug) =>
    request(`/api/letters/${encodeURIComponent(slug)}`)
  ),

  /**
   * Fire-and-forget click beacon. Silent no-op in static mode (no point tracking
   * clicks when there's no backend).
   */
  trackClick: ({ edition_slug, story_url, story_source, story_title }) => {
    if (IS_STATIC_ONLY) return;
    try {
      const body = JSON.stringify({ edition_slug, story_url, story_source, story_title });
      fetch(`${API_BASE}/api/track/click`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {}
  },
};
