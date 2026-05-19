// Server-rendered HTML for /reports/:slug. Crawler-friendly, full content inline.

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function paragraphsHTML(body) {
  return String(body || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => {
      const klass = i === 0 ? "lede-para" : "para";
      return `<p class="${klass}">${esc(p)}</p>`;
    })
    .join("\n");
}

export function renderReportPage({ report, appUrl, ogUrl }) {
  const dateStr = report.published_at
    ? new Date(report.published_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const title = `${report.title} — Dispatch Reports`;
  const description =
    report.subtitle || (report.body ? String(report.body).slice(0, 200) + "…" : "");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Dispatch" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(ogUrl)}" />
<meta property="og:url" content="${esc(appUrl)}/reports/${esc(report.slug)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(ogUrl)}" />
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Crimson+Pro:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  body{margin:0;background:#0d0c0a;color:#f4ecdc;font-family:'Crimson Pro',Georgia,serif;line-height:1.65;font-size:18px}
  a{color:inherit}
  .wrap{max-width:680px;margin:0 auto;padding:48px 24px 96px}
  .kicker{font-family:Inter,system-ui,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a89c84;font-weight:600}
  .masthead{text-align:center;padding-bottom:24px;border-bottom:2px solid #3a3530}
  .masthead h1{font-family:'DM Serif Display',Georgia,serif;font-size:72px;margin:8px 0 4px;letter-spacing:0.01em}
  .topic-tag{display:inline-block;padding:4px 12px;border:1px solid #c9a14a;color:#c9a14a;font-family:Inter,system-ui,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin:36px auto 18px}
  .report-title{font-family:'DM Serif Display',Georgia,serif;font-size:52px;line-height:1.08;color:#f4ecdc;text-align:center;margin:0 0 16px;letter-spacing:-0.005em}
  .report-subtitle{font-family:'Crimson Pro',Georgia,serif;font-style:italic;font-size:22px;color:#d9cfba;text-align:center;max-width:36rem;margin:0 auto 12px}
  .byline{text-align:center;font-family:Inter,system-ui,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a89c84;margin-bottom:36px}
  .rule-gold{border:none;border-top:2px solid #c9a14a;max-width:120px;margin:32px auto}
  .lede-para{font-family:'Crimson Pro',Georgia,serif;font-size:21px;line-height:1.55;color:#f4ecdc;margin:0 0 24px}
  .lede-para::first-letter{font-family:'DM Serif Display',Georgia,serif;float:left;font-size:3.4rem;line-height:0.85;padding:0.35rem 0.55rem 0 0;color:#c9a14a}
  .para{margin:0 0 24px;color:#d9cfba}
  .pull-quote{text-align:center;margin:48px 0;padding:24px 16px;font-family:'DM Serif Display',Georgia,serif;font-style:italic;font-size:30px;line-height:1.3;color:#f4ecdc;border-top:1px solid #3a3530;border-bottom:1px solid #3a3530;max-width:540px;margin-left:auto;margin-right:auto}
  .colophon{text-align:center;color:#a89c84;font-size:13px;margin-top:64px;font-style:italic}
  .colophon a{color:#c9a14a;text-decoration:none}
</style>
</head><body>
<div class="wrap">
  <header class="masthead">
    <div class="kicker">Dispatch Reports · ${esc(dateStr)}</div>
    <h1>Dispatch</h1>
    <div class="kicker">A longer read</div>
  </header>

  <div style="text-align:center">
    ${report.topic ? `<span class="topic-tag">${esc(report.topic)}</span>` : ""}
  </div>
  <h2 class="report-title">${esc(report.title)}</h2>
  ${report.subtitle ? `<p class="report-subtitle">${esc(report.subtitle)}</p>` : ""}
  <p class="byline">By the editor</p>

  <hr class="rule-gold" />

  ${paragraphsHTML(report.body)}

  ${report.pull_quote ? `<div class="pull-quote">"${esc(report.pull_quote)}"</div>` : ""}

  <div class="colophon">
    Synthesized from the past week of Dispatch · Tech editions.<br>
    <a href="${esc(appUrl)}/">Subscribe to the daily brief →</a>
  </div>
</div>
</body></html>`;
}
