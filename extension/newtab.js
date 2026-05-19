// Dispatch new-tab. Pulls the daily sample from the configured API URL.
// User can override the API URL via the settings drawer.

const DEFAULT_API = "http://localhost:5180";
const STORAGE_KEY = "dispatch_ext_api";
const SOURCE_LABELS = {
  hackernews: "HackerNews",
  github_trending: "GitHub",
  lobsters: "Lobsters",
  reddit: "Reddit",
  arxiv: "arXiv",
  show_hn: "Show HN",
};

function getApiUrl() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_API;
}

function setApiUrl(v) {
  if (v) localStorage.setItem(STORAGE_KEY, v.replace(/\/+$/, ""));
}

function esc(s) {
  const el = document.createElement("span");
  el.textContent = String(s == null ? "" : s);
  return el.innerHTML;
}

function todayLine() {
  return new Date()
    .toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    .toUpperCase();
}

function storyMeta(st) {
  const m = st.meta || {};
  if (st.source === "hackernews") return `▲ ${m.score ?? 0} · ${m.comments ?? 0} comments`;
  if (st.source === "github_trending") return `${m.language || "Repo"} · +${m.stars_today ?? 0} stars today`;
  if (st.source === "lobsters") return `▲ ${m.score ?? 0} · ${m.comments ?? 0} comments`;
  if (st.source === "reddit") return `r/${m.subreddit ?? "?"} · ${m.score ?? 0} upvotes`;
  return "";
}

function renderStory(st, isPick) {
  return `
    <article class="story">
      <div class="story-meta">
        ${esc(SOURCE_LABELS[st.source] || "Source")} &middot; ${esc(storyMeta(st))}
        ${isPick ? ' &middot; <span style="color:var(--gold)">★ Editor\'s Pick</span>' : ""}
      </div>
      <h3 class="story-title"><a href="${esc(st.url)}" target="_blank" rel="noreferrer">${esc(st.title)}</a></h3>
      ${st.tldr ? `<p class="story-tldr">${esc(st.tldr)}</p>` : ""}
      ${st.why_it_matters ? `<p class="story-why">— ${esc(st.why_it_matters)}</p>` : ""}
    </article>`;
}

function renderBrief(brief, root) {
  const pickRef = brief?.editor_pick;
  const allStories = (brief?.sections || []).flatMap((s) => s.stories || []);
  const pick = pickRef ? allStories.find((st) => st.ref === pickRef) : null;

  const sectionsHtml = (brief?.sections || [])
    .map((sec) => {
      const stories = (sec.stories || []).filter((st) => st.ref !== pickRef);
      if (!stories.length) return "";
      return `
        <section class="topic">
          <span class="eyebrow">${esc(sec.topic)}</span>
          ${stories.map((st) => renderStory(st, false)).join("")}
        </section>`;
    })
    .join("");

  root.innerHTML = `
    ${brief.headline ? `<section class="lede">
      <p class="eyebrow">Today's lede</p>
      <h2 class="headline">${esc(brief.headline)}</h2>
      ${brief.editor_note ? `<p class="editor-note">${esc(brief.editor_note)}<br><span class="kicker">— The Editor</span></p>` : ""}
    </section>` : ""}

    <hr class="rule-gold" />

    ${pick ? `<div class="pick-banner"><div class="pick-label">Today's Editor's Pick</div>${renderStory(pick, true)}</div>` : ""}

    ${sectionsHtml}
  `;
}

function renderError(msg, root) {
  root.innerHTML = `
    <div class="error">
      <p class="kicker" style="margin-bottom:12px">Couldn't load Dispatch</p>
      <p>${esc(msg)}</p>
      <p style="margin-top:24px"><a href="#" id="reload-btn" style="color:var(--gold)">Retry</a></p>
    </div>`;
  document.getElementById("reload-btn")?.addEventListener("click", (e) => { e.preventDefault(); load(); });
}

function renderSettings(root) {
  const current = getApiUrl();
  root.innerHTML = `
    <div class="settings">
      <label for="api-url">Dispatch API URL</label>
      <input id="api-url" type="text" value="${esc(current)}" placeholder="https://your-dispatch.onrender.com" />
      <button id="save-api" class="save-btn">Save & reload</button>
    </div>`;
  document.getElementById("save-api").addEventListener("click", () => {
    setApiUrl(document.getElementById("api-url").value.trim());
    location.reload();
  });
}

async function load() {
  const dateEl = document.getElementById("date");
  if (dateEl) dateEl.textContent = todayLine();
  const root = document.getElementById("content");

  try {
    const r = await fetch(`${getApiUrl()}/api/sample`, { credentials: "include" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const brief = await r.json();
    renderBrief(brief, root);
    const open = document.getElementById("open-app");
    if (open) open.href = getApiUrl().replace(/:5180$/, ":5173") + "/today";
  } catch (err) {
    renderError(err.message, root);
  }
}

document.getElementById("settings-btn").addEventListener("click", (e) => {
  e.preventDefault();
  renderSettings(document.getElementById("content"));
});

load();
