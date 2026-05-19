import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Dispatch <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL || "http://localhost:5173";

let resendClient = null;
function client() {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
  if (!resendClient) resendClient = new Resend(RESEND_API_KEY);
  return resendClient;
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

/* ─── Magic-link email ─────────────────────────────────────── */

export async function sendMagicLink({ to, verifyUrl }) {
  const subject = "Your Dispatch login link";
  const html = magicLinkHtml(verifyUrl);
  const text = `Open this link to sign in to Dispatch:\n\n${verifyUrl}\n\nIt expires in 15 minutes.`;
  return client().emails.send({ from: FROM_EMAIL, to, subject, html, text });
}

function magicLinkHtml(verifyUrl) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fdfaf2;font-family:Georgia,serif;color:#1a1a1a">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdfaf2">
    <tr><td align="center" style="padding:48px 16px">
      <table width="540" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%">
        <tr><td style="text-align:center;padding-bottom:24px;border-bottom:2px double #1a1a1a">
          <div style="font-family:Georgia,serif;font-size:48px;letter-spacing:0.02em;line-height:1">Dispatch</div>
          <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#5a4a1a;margin-top:8px">The wire, edited.</div>
        </td></tr>
        <tr><td style="padding:36px 0 24px">
          <p style="font-size:18px;line-height:1.5;margin:0 0 20px">Welcome. Open the link below to finish signing in to Dispatch:</p>
          <p style="margin:24px 0"><a href="${esc(verifyUrl)}" style="display:inline-block;background:#1a1a1a;color:#fdfaf2;padding:14px 28px;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">Sign in to Dispatch</a></p>
          <p style="font-size:14px;color:#5a4a1a;line-height:1.5;margin:24px 0 0">The link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="border-top:1px solid #3a3530;padding-top:16px;text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#5a4a1a;letter-spacing:0.06em">
          Dispatch &middot; an AI-curated morning brief for working developers
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/* ─── Welcome email (Wave N Day 5) ───────────────────────── */

/**
 * Fired the first time a user completes magic-link verification.
 * Sets expectations + opens the founder-reply channel. Reads in <60 seconds.
 */
export async function sendWelcomeEmail({ user }) {
  const subject = "Welcome to Dispatch — what to expect tomorrow morning";
  const html = welcomeHtml({ user });
  const text = welcomeText({ user });
  return client().emails.send({ from: FROM_EMAIL, to: user.email, subject, html, text });
}

function welcomeHtml({ user }) {
  const accountUrl = `${APP_URL}/account`;
  const sendTime = user.send_time || "08:00";
  const firstName = (user.name || user.email?.split("@")[0] || "").split(/\s+/)[0];
  const greeting = firstName ? `Welcome, ${esc(firstName)}.` : "Welcome.";
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fdfaf2;font-family:Georgia,serif;color:#1a1a1a">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdfaf2">
    <tr><td align="center" style="padding:48px 16px">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">
        <tr><td style="text-align:center;padding-bottom:24px;border-bottom:2px double #1a1a1a">
          <div style="font-family:Georgia,serif;font-size:48px;letter-spacing:0.02em;line-height:1">Dispatch</div>
          <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#5a4a1a;margin-top:8px">The wire, edited.</div>
        </td></tr>

        <tr><td style="padding:36px 0 8px">
          <h2 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;margin:0 0 18px;color:#1a1a1a">${greeting}</h2>
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px">
            You're subscribed to Dispatch · Tech. Tomorrow morning at around <strong>${esc(sendTime)} local</strong>, you'll get your first brief — five minutes of what mattered overnight in software, tuned to your role and beats.
          </p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px">
            One email per weekday. Never on weekends. The editor reads HackerNews, GitHub Trending, Lobsters, Reddit, arXiv, Show HN, and the month's hiring + layoff signal, then writes you a brief in plain editorial voice. Every story carries a line about what it means for your career.
          </p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 24px">
            <strong>One thing worth saying up front:</strong> if a brief feels off — a story that didn't belong, a line that sounded like marketing, a beat that's not landing — hit reply. The founder reads every email. The product gets better because subscribers tell us what's broken.
          </p>
        </td></tr>

        <tr><td style="padding:8px 0 28px">
          <p style="text-align:center;margin:0">
            <a href="${esc(accountUrl)}" style="display:inline-block;background:#1a1a1a;color:#fdfaf2;padding:14px 28px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">
              Visit your account
            </a>
          </p>
          <p style="text-align:center;font-size:13px;color:#5a4a1a;margin:14px 0 0;line-height:1.55">
            You can change your beats, send time, or pause delivery anytime.<br>
            One-click unsubscribe at the bottom of every brief.
          </p>
        </td></tr>

        <tr><td style="border-top:1px solid #3a3530;padding-top:18px;text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#5a4a1a;letter-spacing:0.06em;line-height:1.6">
          Dispatch &middot; an AI-curated morning brief for working developers<br>
          <a href="${esc(APP_URL)}" style="color:#8b6914;text-decoration:none">${esc(APP_URL.replace(/^https?:\/\//, ""))}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function welcomeText({ user }) {
  const sendTime = user.send_time || "08:00";
  const firstName = (user.name || user.email?.split("@")[0] || "").split(/\s+/)[0];
  return `${firstName ? `Welcome, ${firstName}.` : "Welcome."}

You're subscribed to Dispatch · Tech. Tomorrow morning at around ${sendTime} local, you'll get your first brief — five minutes of what mattered overnight in software, tuned to your role and beats.

One email per weekday. Never on weekends.

One thing worth saying up front: if a brief feels off — a story that didn't belong, a line that sounded like marketing, a beat that's not landing — hit reply. The founder reads every email.

Manage your subscription: ${APP_URL}/account
`;
}

/* ─── Brief email ─────────────────────────────────────────── */

export async function sendBriefEmail({ user, brief, slug, viewToken }) {
  const subject = brief.email_subject || `Dispatch · ${todayHeader()}`;
  const html = briefHtml({ user, brief, slug, viewToken });
  const text = briefText({ brief });
  return client().emails.send({ from: FROM_EMAIL, to: user.email, subject, html, text });
}

/**
 * Forward an edition to a friend's email. The HTML has a subscribe CTA appended.
 * `inviteToken` is the forwarder's invite token so attribution flows back if the recipient subs.
 */
export async function sendForwardedEdition({ toEmail, fromName, brief, inviteToken }) {
  const subject = `${fromName || "A friend"} sent you a Dispatch · Tech edition`;
  const ctaUrl = inviteToken
    ? `${APP_URL}/i/${encodeURIComponent(inviteToken)}`
    : `${APP_URL}/try`;
  const html = forwardHtml({ fromName: fromName || "a friend", brief, ctaUrl });
  const text =
    `${fromName || "A friend"} sent you today's Dispatch · Tech.\n\n` +
    `${brief.headline}\n\n` +
    (brief.editor_note ? brief.editor_note + "\n\n" : "") +
    `Subscribe to your own daily brief: ${ctaUrl}\n`;
  return client().emails.send({ from: FROM_EMAIL, to: toEmail, subject, html, text });
}

function forwardHtml({ fromName, brief, ctaUrl }) {
  // Reuse the regular brief HTML and inject a "forwarded by" banner on top + a stronger CTA below.
  // To avoid a giant code path, we just send a smaller "preview" — the editor's note + a CTA card.
  const safeBrief = brief || {};
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fdfaf2;font-family:Georgia,serif;color:#1a1a1a">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdfaf2">
    <tr><td align="center" style="padding:32px 16px">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">

        <tr><td style="padding:12px 0 8px;text-align:center">
          <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#8b6914;font-weight:600">A friend forwarded you Dispatch</div>
        </td></tr>
        <tr><td style="border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;height:5px;margin:4px 0 12px"></td></tr>

        <tr><td style="padding:18px 0 8px;text-align:center">
          <div style="font-family:Georgia,serif;font-size:48px;letter-spacing:0.02em;line-height:1">Dispatch</div>
        </td></tr>

        <tr><td style="padding:28px 0 18px;text-align:center">
          <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#8b6914;font-weight:600;margin-bottom:14px">Today's lede</div>
          <div style="font-family:Georgia,serif;font-size:24px;line-height:1.18;color:#1a1a1a;margin-bottom:14px">${esc(safeBrief.headline || "")}</div>
          ${safeBrief.editor_note ? `<div style="font-family:Georgia,serif;font-style:italic;font-size:15px;line-height:1.55;color:#2a2a2a;max-width:440px;margin:0 auto">${esc(safeBrief.editor_note)}</div>` : ""}
        </td></tr>

        <tr><td style="padding:24px 0;text-align:center">
          <p style="font-family:Georgia,serif;font-size:15px;color:#2a2a2a;margin:0 0 18px">
            ${esc(fromName)} reads Dispatch · Tech every weekday morning &mdash; an AI-curated career brief for working developers. Want one tuned to your role?
          </p>
          <a href="${esc(ctaUrl)}" style="display:inline-block;background:#1a1a1a;color:#fdfaf2;padding:14px 28px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">
            Try it &mdash; it's free
          </a>
        </td></tr>

        <tr><td style="border-top:1px solid #3a3530;padding-top:16px;text-align:center;font-family:Arial,sans-serif;font-size:10px;color:#5a4a1a;letter-spacing:0.06em">
          Dispatch &middot; a career-intelligence brief for technology professionals.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function todayHeader() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function briefText({ brief }) {
  const parts = [`DISPATCH — ${todayHeader().toUpperCase()}`, ""];
  if (brief.founder_note?.body) parts.push("FROM THE EDITOR'S DESK:", brief.founder_note.body, "");
  parts.push(brief.headline || "");
  if (brief.editor_note) parts.push("", brief.editor_note, "— The Editor");
  if (brief.take) parts.push("", "THE EDITOR'S TAKE:", brief.take);
  if (brief.featured_comment) {
    parts.push("", `[FROM THE COMMENTS] "${brief.featured_comment.text}" — ${brief.featured_comment.author}`);
  }
  if (brief.pull_quote) parts.push("", `"${brief.pull_quote}"`);
  for (const sec of brief.sections || []) {
    parts.push("", `[${sec.topic.toUpperCase()}]`);
    for (const st of sec.stories) {
      parts.push("", `• ${st.title}`);
      if (st.tldr) parts.push(`  ${st.tldr}`);
      if (st.why_it_matters) parts.push(`  — ${st.why_it_matters}`);
      if (st.community_take) parts.push(`  Community: ${st.community_take}`);
      parts.push(`  ${st.url}`);
    }
  }
  return parts.join("\n");
}

function briefHtml({ user, brief, slug, viewToken }) {
  const viewUrl = `${APP_URL}/edition/${slug}?t=${encodeURIComponent(viewToken)}`;
  const accountUrl = `${APP_URL}/account`;
  const unsubscribeUrl = `${APP_URL}/unsubscribe?t=${encodeURIComponent(user.unsubscribe_token)}`;
  const pickStory = brief.editor_pick
    ? (brief.sections || []).flatMap((s) => s.stories).find((st) => st.ref === brief.editor_pick)
    : null;

  const sectionsHtml = (brief.sections || [])
    .map((sec) => {
      const storiesHtml = sec.stories
        .filter((st) => st.ref !== brief.editor_pick)
        .map((st) => renderStoryRow(st))
        .join("");
      if (!storiesHtml) return "";
      return `
        <tr><td style="padding:32px 0 12px">
          <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#8b6914;font-weight:600">${esc(sec.topic)}</div>
          <hr style="border:none;border-top:1px solid #3a3530;margin:8px 0 16px"/>
        </td></tr>
        ${storiesHtml}`;
    })
    .join("");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fdfaf2;font-family:Georgia,serif;color:#1a1a1a">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdfaf2">
    <tr><td align="center" style="padding:32px 16px">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

        <!-- Masthead -->
        <tr><td style="text-align:center;padding-bottom:8px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#5a4a1a;text-align:left">Vol. I</td>
            <td style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#5a4a1a;text-align:right">${esc(todayHeader().toUpperCase())}</td>
          </tr></table>
          <hr style="border:none;border-top:1px solid #1a1a1a;margin:8px 0 0"/>
          <div style="font-family:Georgia,serif;font-size:64px;letter-spacing:0.02em;line-height:1;padding:16px 0 8px">Dispatch</div>
          <div style="border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;height:5px;margin:4px 0 12px"></div>
          <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#5a4a1a">The wire, edited.</div>
        </td></tr>

        ${brief.founder_note?.body ? `<tr><td style="padding:18px 0 8px">
          <div style="background:rgba(201,161,74,0.08);border:1px solid rgba(201,161,74,0.35);border-radius:2px;padding:14px 18px;margin:8px auto;max-width:480px;text-align:center">
            <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#8b6914;font-weight:600;margin-bottom:8px">From the editor's desk</div>
            <div style="font-family:Georgia,serif;font-style:italic;font-size:15px;line-height:1.5;color:#2a2a2a">${esc(brief.founder_note.body)}</div>
          </div>
        </td></tr>` : ""}

        <!-- Lede -->
        <tr><td style="padding:36px 0 18px;text-align:center">
          <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#8b6914;font-weight:600;margin-bottom:14px">Today's Lede</div>
          <div style="font-family:Georgia,serif;font-size:30px;line-height:1.15;color:#1a1a1a">${esc(brief.headline || "Today in dev")}</div>
          ${brief.editor_note ? `<div style="font-family:Georgia,serif;font-style:italic;font-size:16px;line-height:1.5;color:#2a2a2a;margin:18px auto 6px;max-width:480px">${esc(brief.editor_note)}</div><div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#5a4a1a">— The Editor</div>` : ""}
        </td></tr>

        ${brief.take ? `<tr><td style="padding:8px 0">
          <div style="border-top:1px solid #8b6914;border-bottom:1px solid #8b6914;padding:14px 8px;margin:18px auto;max-width:480px;text-align:center">
            <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#8b6914;font-weight:600;margin-bottom:8px">The Editor's Take</div>
            <div style="font-family:Georgia,serif;font-size:18px;line-height:1.35;color:#1a1a1a">${esc(brief.take)}</div>
          </div>
        </td></tr>` : ""}

        <tr><td><hr style="border:none;border-top:2px solid #8b6914;margin:24px 0 0"/></td></tr>

        ${brief.featured_comment ? renderFeaturedComment(brief.featured_comment) : ""}
        ${pickStory ? renderEditorsPick(pickStory) : ""}
        ${brief.pull_quote ? renderPullQuote(brief.pull_quote) : ""}

        ${sectionsHtml}

        ${Array.isArray(brief.quoted) && brief.quoted.length ? renderQuotedWrap(brief.quoted) : ""}

        <!-- Footer -->
        <tr><td style="padding:48px 0 16px"><hr style="border:none;border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;height:5px"/></td></tr>
        <tr><td style="text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#5a4a1a;line-height:1.6">
          <a href="${esc(viewUrl)}" style="color:#5a4a1a;text-decoration:underline">View in browser</a> &nbsp;·&nbsp;
          <a href="${esc(accountUrl)}" style="color:#5a4a1a;text-decoration:underline">Manage subscription</a> &nbsp;·&nbsp;
          <a href="${esc(unsubscribeUrl)}" style="color:#5a4a1a;text-decoration:underline">Unsubscribe</a>
          <div style="margin-top:14px;font-style:italic">Edited by an attentive language model. Sourced from HackerNews and GitHub Trending.</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

function renderEditorsPick(st) {
  const hype = st.hype ? HYPE_EMAIL[st.hype] : null;
  return `
  <tr><td style="padding:18px 0 12px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #8b6914;border-bottom:2px solid #8b6914;padding:0">
      <tr><td style="text-align:center;padding:8px 0 0">
        <span style="background:#8b6914;color:#fdfaf2;font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;padding:4px 10px;font-weight:700">★ Editor's Pick</span>
      </td></tr>
      <tr><td style="padding:18px 16px 22px">
        <a href="${esc(st.url)}" style="text-decoration:none;color:#1a1a1a">
          <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#5a4a1a;margin-bottom:8px">
            ${esc(sourceName(st.source))}
            ${hype ? `&nbsp;·&nbsp;<span style="color:${hype.color}">${hype.label}</span>` : ""}
          </div>
          <div style="font-family:Georgia,serif;font-size:26px;line-height:1.2;margin-bottom:10px">${esc(st.title)}</div>
          ${st.tldr ? `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#2a2a2a">${esc(st.tldr)}</div>` : ""}
          ${st.why_it_matters ? `<div style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#5a4a1a;margin-top:8px">— ${esc(st.why_it_matters)}</div>` : ""}
          ${st.deep_dive ? `<div style="margin-top:14px;padding-top:12px;border-top:1px solid #cbb88f"><div style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#8b6914;margin-bottom:8px">The Editor Goes Deeper</div><div style="font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#2a2a2a">${esc(st.deep_dive)}</div></div>` : ""}
          ${st.community_take ? `<div style="margin-top:10px;padding:10px 14px;border-left:3px solid #8b6914;background:rgba(139,105,20,0.07);font-family:Georgia,serif;font-style:italic;font-size:14px;color:#3a3530"><span style="font-family:Arial,sans-serif;font-style:normal;font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#8b6914;margin-right:6px">Community take</span>${esc(st.community_take)}</div>` : ""}
        </a>
      </td></tr>
    </table>
  </td></tr>`;
}

function renderFeaturedComment(fc) {
  return `
  <tr><td style="padding:24px 0 16px;text-align:center">
    <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#8b6914;font-weight:600;margin-bottom:10px">From the Comments</div>
    <div style="font-family:Georgia,serif;font-style:italic;font-size:36px;line-height:0.2;color:#8b6914">“</div>
    <div style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#2a2a2a;max-width:480px;margin:0 auto;padding:0 12px">${esc(fc.text)}</div>
    <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#5a4a1a;margin-top:10px">— ${esc(fc.author)}, in today's HackerNews discussion</div>
  </td></tr>`;
}

function renderQuotedWrap(quoted) {
  const items = quoted
    .map(
      (q) => `
      <tr><td style="padding:14px 0;border-bottom:1px solid #cbb88f">
        <div style="font-family:Georgia,serif;font-style:italic;font-size:17px;line-height:1.45;color:#1a1a1a">"${esc(q.text)}"</div>
        ${q.edition_date ? `<div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#5a4a1a;margin-top:6px">From the ${esc(new Date(q.edition_date).toLocaleDateString("en-US", { weekday: "long" }))} edition</div>` : ""}
      </td></tr>`
    )
    .join("");
  return `
  <tr><td style="padding:36px 0 18px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #8b6914;border-bottom:2px solid #8b6914">
      <tr><td style="padding:14px 16px 8px;text-align:center">
        <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#8b6914;font-weight:700">Quoted · this week</div>
      </td></tr>
      <tr><td style="padding:0 16px 14px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
      </td></tr>
    </table>
  </td></tr>`;
}

function renderPullQuote(quote) {
  return `
  <tr><td style="padding:32px 0;text-align:center">
    <div style="font-family:Georgia,serif;font-size:48px;line-height:0.4;color:#8b6914">“</div>
    <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;line-height:1.3;max-width:460px;margin:0 auto">${esc(quote)}</div>
  </td></tr>`;
}

function sourceName(s) {
  return {
    hackernews: "HackerNews",
    github_trending: "GitHub",
    lobsters: "Lobsters",
    reddit: "Reddit",
  }[s] || "Source";
}

function metaLine(st) {
  const m = st.meta || {};
  switch (st.source) {
    case "hackernews":
      return `▲ ${m.score ?? 0} · ${m.comments ?? 0} comments`;
    case "github_trending":
      return `${m.language || "Repo"} · +${m.stars_today ?? 0} stars today`;
    case "lobsters":
      return `▲ ${m.score ?? 0} · ${m.comments ?? 0} comments`;
    case "reddit":
      return `r/${m.subreddit ?? "?"} · ${m.score ?? 0} upvotes · ${m.comments ?? 0} comments`;
    default:
      return "";
  }
}

const HYPE_EMAIL = {
  hyped: { label: "Heat", color: "#9c5a1f" },
  skeptical: { label: "Skeptical", color: "#1e4a82" },
  experimental: { label: "Experimental", color: "#5a3d8c" },
  deep_dive: { label: "Deep Dive", color: "#2d6b3a" },
};

function renderStoryRow(st) {
  const hype = st.hype ? HYPE_EMAIL[st.hype] : null;
  return `
  <tr><td style="padding:0 0 18px;border-bottom:1px solid #3a3530">
    <a href="${esc(st.url)}" style="text-decoration:none;color:#1a1a1a;display:block;padding-bottom:12px">
      <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#5a4a1a;margin-bottom:6px">
        ${esc(sourceName(st.source))} &nbsp;·&nbsp; ${esc(metaLine(st))}
        ${hype ? `&nbsp;·&nbsp; <span style="color:${hype.color}">${hype.label}</span>` : ""}
      </div>
      <div style="font-family:Georgia,serif;font-size:20px;line-height:1.2;margin-bottom:8px">${esc(st.title)}</div>
      ${st.tldr ? `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.5;color:#2a2a2a">${esc(st.tldr)}</div>` : ""}
      ${st.why_it_matters ? `<div style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#5a4a1a;margin-top:6px">— ${esc(st.why_it_matters)}</div>` : ""}
      ${st.community_take ? `<div style="margin-top:8px;padding:8px 12px;border-left:3px solid #8b6914;background:rgba(139,105,20,0.06);font-family:Georgia,serif;font-style:italic;font-size:13px;color:#3a3530"><span style="font-family:Arial,sans-serif;font-style:normal;font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#8b6914;margin-right:6px">Community take</span>${esc(st.community_take)}</div>` : ""}
    </a>
  </td></tr>`;
}
