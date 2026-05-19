const API_BASE = import.meta.env.VITE_API_URL || "";

// Static-mode fallback — when VITE_API_URL is unset OR a fetch fails, the
// demo deploy falls back to a baked-in sample brief so /demo, /today, and the
// landing's "today's lede" banner stay functional without a backend.
const STATIC_FALLBACK = import.meta.env.VITE_STATIC_FALLBACK !== "false";

async function request(path, opts = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    ...opts,
  });
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
 */
async function requestWithStaticFallback(apiPath, staticPath) {
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
 *   onDelta(chunk: string)
 *   onComplete(brief)
 *   onError(err)
 * Returns a function you can call to abort the stream.
 */
export function streamBrief(body, { onDelta, onComplete, onError } = {}) {
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
  brief: (body) => request("/api/brief", { method: "POST", body: JSON.stringify(body) }),
  streamBrief,
  sample: () => requestWithStaticFallback("/api/sample", "/sample-brief.json"),
  authRequest: (body) =>
    request("/api/auth/request", { method: "POST", body: JSON.stringify(body) }),
  authVerify: (token) => request(`/api/auth/verify?token=${encodeURIComponent(token)}`),
  authLogout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/me"),
  updateMe: (body) => request("/api/me", { method: "PATCH", body: JSON.stringify(body) }),
  deleteMe: () => request("/api/me", { method: "DELETE" }),
  testSend: () => request("/api/me/test-send", { method: "POST" }),
  edition: (slug, viewToken) =>
    request(`/api/editions/${slug}${viewToken ? `?t=${encodeURIComponent(viewToken)}` : ""}`),
  listEditions: (before) =>
    request(`/api/editions${before ? `?before=${encodeURIComponent(before)}` : ""}`),
  teamShare: (slug) => request(`/api/editions/${encodeURIComponent(slug)}/team-share`, { method: "POST" }),
  forwardEdition: (slug, to_email) =>
    request(`/api/editions/${encodeURIComponent(slug)}/forward`, {
      method: "POST",
      body: JSON.stringify({ to_email }),
    }),
  bookmarks: () => request("/api/bookmarks"),
  addBookmark: (body) =>
    request("/api/bookmarks", { method: "POST", body: JSON.stringify(body) }),
  removeBookmark: (story_url) =>
    request(`/api/bookmarks?story_url=${encodeURIComponent(story_url)}`, { method: "DELETE" }),
  setBookmarkVisibility: (story_url, is_public) =>
    request(`/api/bookmarks/visibility`, {
      method: "PATCH",
      body: JSON.stringify({ story_url, is_public }),
    }),
  discoverThisWeek: () => request("/api/discover/this-week"),
  search: (q) => request(`/api/me/search?q=${encodeURIComponent(q)}`),
  unsubscribe: (token) =>
    request(`/api/unsubscribe?t=${encodeURIComponent(token)}`),
  myInvite: () => request("/api/invites/me"),
  inviteLeaderboard: () => request("/api/invites/leaderboard"),
  inviteStats: () => request("/api/invites/stats"),
  skillsTrending: () => request("/api/me/skills-trending"),
  streak: () => request("/api/me/streak"),
  postLetter: (slug, body) =>
    request(`/api/letters/${encodeURIComponent(slug)}`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  listLetters: (slug) => request(`/api/letters/${encodeURIComponent(slug)}`),
  /**
   * Fire-and-forget click beacon. Uses fetch with keepalive so the request survives navigation.
   * Returns immediately; failures are silent.
   */
  trackClick: ({ edition_slug, story_url, story_source, story_title }) => {
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
