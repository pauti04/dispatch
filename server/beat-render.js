// Server-rendered HTML for /beats/:slug. Crawler-friendly (full content inline,
// proper OG meta tags). Humans see the same page, then can click into the SPA.

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function todayDateLine() {
  return new Date()
    .toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

function sourceName(s) {
  return {
    hackernews: "HackerNews",
    github_trending: "GitHub",
    lobsters: "Lobsters",
    reddit: "Reddit",
    arxiv: "arXiv",
    show_hn: "Show HN",
  }[s] || "Source";
}

function storyHTML(st, isPick) {
  const meta = (() => {
    const m = st.meta || {};
    if (st.source === "hackernews") return `▲ ${m.score ?? 0} · ${m.comments ?? 0} comments`;
    if (st.source === "github_trending") return `${m.language || "Repo"} · +${m.stars_today ?? 0} stars today`;
    if (st.source === "lobsters") return `▲ ${m.score ?? 0} · ${m.comments ?? 0} comments`;
    if (st.source === "reddit") return `r/${m.subreddit ?? "?"} · ${m.score ?? 0} upvotes`;
    return "";
  })();
  return `
    <article style="padding:18px 0;border-bottom:1px solid #3a3530">
      <div style="font-family:Inter,system-ui,sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#a89c84;margin-bottom:6px">
        ${esc(sourceName(st.source))} &middot; ${esc(meta)}${isPick ? ' &middot; <span style="color:#c9a14a">★ Editor\'s Pick</span>' : ""}
      </div>
      <h3 style="font-family:'DM Serif Display',Georgia,serif;font-size:${isPick ? "32px" : "22px"};line-height:1.18;color:#f4ecdc;margin:0 0 8px"><a href="${esc(st.url)}" style="color:inherit;text-decoration:none">${esc(st.title)}</a></h3>
      ${st.tldr ? `<p style="font-family:'Crimson Pro',Georgia,serif;font-size:16px;line-height:1.55;color:#d9cfba;margin:0 0 6px">${esc(st.tldr)}</p>` : ""}
      ${st.why_it_matters ? `<p style="font-family:'Crimson Pro',Georgia,serif;font-style:italic;font-size:14px;color:#a89c84;margin:0">— ${esc(st.why_it_matters)}</p>` : ""}
    </article>`;
}

/**
 * Returns a full HTML document.
 */
export function renderBeatPage({ beat, brief, appUrl, ogUrl }) {
  const dateLine = todayDateLine();
  const pickRef = brief?.editor_pick;
  const allStories = (brief?.sections || []).flatMap((s) => s.stories || []);
  const pick = pickRef ? allStories.find((st) => st.ref === pickRef) : null;
  const otherStories = allStories.filter((st) => st.ref !== pickRef);

  const sectionsHTML = (brief?.sections || [])
    .map((sec) => {
      const stories = (sec.stories || []).filter((st) => st.ref !== pickRef);
      if (!stories.length) return "";
      return `
        <section style="margin-top:36px">
          <p style="font-family:Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:0.22em;font-size:11px;font-weight:600;color:#c9a14a;margin:0 0 6px">${esc(sec.topic)}</p>
          <hr style="border:none;border-top:1px solid #3a3530;margin:0 0 18px">
          ${stories.map((st) => storyHTML(st, false)).join("")}
        </section>`;
    })
    .join("");

  const title = `Dispatch · ${beat.name} — ${dateLine}`;
  const description = brief?.editor_note || beat.tagline;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="theme-color" content="#0d0c0a" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Dispatch" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(ogUrl)}" />
  <meta property="og:url" content="${esc(appUrl)}/beats/${esc(beat.id)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(ogUrl)}" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Crimson+Pro:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { margin:0; background:#0d0c0a; color:#f4ecdc; font-family:'Crimson Pro',Georgia,serif; line-height:1.55; }
    a { color:inherit }
    .wrap { max-width:760px; margin:0 auto; padding:48px 24px 72px }
    .kicker { font-family:Inter,system-ui,sans-serif; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; color:#a89c84 }
    .masthead { text-align:center; padding:32px 0 16px; border-bottom:2px solid #3a3530 }
    .masthead h1 { font-family:'DM Serif Display',Georgia,serif; font-size:72px; margin:8px 0 4px; letter-spacing:0.01em }
    .masthead .gold { color:#c9a14a }
    .lede { text-align:center; margin:36px 0 12px }
    .headline { font-family:'DM Serif Display',Georgia,serif; font-size:42px; line-height:1.1; color:#f4ecdc; margin:0 0 16px }
    .editor-note { font-style:italic; color:#d9cfba; max-width:36rem; margin:0 auto }
    .rule-gold { border:none; border-top:2px solid #c9a14a; margin:24px 0 }
    .pick-banner { border-top:2px solid #c9a14a; border-bottom:2px solid #c9a14a; padding:24px 0; margin:36px 0 8px; position:relative }
    .pick-label { position:absolute; top:-9px; left:50%; transform:translateX(-50%); background:#0d0c0a; padding:0 12px; font-family:Inter,system-ui,sans-serif; font-size:10px; font-weight:700; letter-spacing:0.28em; text-transform:uppercase; color:#c9a14a }
    .cta { text-align:center; margin:48px 0 0 }
    .btn { display:inline-block; background:#f4ecdc; color:#0d0c0a; font-family:Inter,system-ui,sans-serif; font-weight:600; font-size:13px; letter-spacing:0.08em; text-transform:uppercase; padding:14px 26px; text-decoration:none; border-radius:2px }
    .btn:hover { background:#c9a14a }
    .colophon { text-align:center; color:#a89c84; font-size:13px; margin-top:48px; font-style:italic }
    .colophon a { color:#c9a14a; text-decoration:none }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="masthead">
      <div class="kicker">${esc(dateLine)}</div>
      <h1>Dispatch <span class="gold">·</span> ${esc(beat.name)}</h1>
      <div class="kicker">${esc(beat.tagline)}</div>
    </header>

    ${brief?.headline ? `<section class="lede"><p class="kicker">Today's lede</p><h2 class="headline">${esc(brief.headline)}</h2>${brief.editor_note ? `<p class="editor-note">${esc(brief.editor_note)}<br><span class="kicker">— The Editor</span></p>` : ""}</section>` : ""}

    <hr class="rule-gold" />

    ${pick ? `<div class="pick-banner"><div class="pick-label">Today's Editor's Pick</div>${storyHTML(pick, true)}</div>` : ""}

    ${sectionsHTML}

    <div class="cta">
      <a href="${esc(appUrl)}/try" class="btn">Build my own edition</a>
      <p class="kicker" style="margin-top:14px">Free · one click to unsubscribe · no password</p>
    </div>

    <div class="colophon">
      Edited by an attentive language model. Sourced from HackerNews, GitHub Trending, Lobsters, Reddit, arXiv, and Show HN.<br>
      <a href="${esc(appUrl)}/">More from Dispatch</a>
    </div>
  </div>
</body>
</html>`;
}
