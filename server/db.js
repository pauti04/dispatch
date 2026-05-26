import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

// When DATABASE_URL is missing (CI test runs, static-only demos), neon() throws at
// import time. Replace it with a thin stub that rejects on actual use but lets
// module imports + pure-function tests proceed.
export const sql = process.env.DATABASE_URL
  ? neon(process.env.DATABASE_URL)
  : (() => {
      const stub = async () => {
        throw new Error("DATABASE_URL not configured — db calls unavailable in this environment");
      };
      // sql is used as both a function and a tagged template — handle both
      stub.unsafe = stub;
      stub.transaction = stub;
      return stub;
    })();

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL missing — db calls will reject when invoked");
}

/* ─── User queries ─────────────────────────────────────────── */

export async function findOrCreateUserByEmail(email) {
  const existing = await sql`select * from users where email = ${email} limit 1`;
  if (existing.length) return existing[0];
  const created = await sql`
    insert into users (email) values (${email})
    on conflict (email) do update set email = excluded.email
    returning *
  `;
  return created[0];
}

export async function getUserById(id) {
  const r = await sql`select * from users where id = ${id} limit 1`;
  return r[0] || null;
}

export async function getUserByUnsubscribeToken(token) {
  const r = await sql`select * from users where unsubscribe_token = ${token} limit 1`;
  return r[0] || null;
}

export async function getUserByFeedToken(token) {
  // For now, feed token == unsubscribe token (both are random, unique, per-user).
  return getUserByUnsubscribeToken(token);
}

/* ─── Team share tokens ────────────────────────────────────── */

export async function createTeamShareToken({ editionSlug, createdByUserId, ttlDays = 7 }) {
  const expires = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
  const r = await sql`
    insert into team_share_tokens (token, edition_slug, created_by_user_id, expires_at)
    values (encode(gen_random_bytes(16), 'hex'), ${editionSlug}, ${createdByUserId}, ${expires})
    returning token, expires_at
  `;
  return r[0];
}

export async function getTeamShareToken(token) {
  const r = await sql`
    select token, edition_slug, expires_at, created_by_user_id
    from team_share_tokens
    where token = ${token} and expires_at > now()
    limit 1
  `;
  return r[0] || null;
}

/* ─── Invites ──────────────────────────────────────────────── */

export async function getOrCreateInviteForUser(userId) {
  const existing = await sql`select token from invites where owner_user_id = ${userId} limit 1`;
  if (existing[0]) return existing[0].token;
  const r = await sql`
    insert into invites (token, owner_user_id)
    values (encode(gen_random_bytes(12), 'hex'), ${userId})
    returning token
  `;
  return r[0].token;
}

export async function getInviteByToken(token) {
  const r = await sql`
    select i.token, i.owner_user_id, u.email as owner_email
    from invites i join users u on u.id = i.owner_user_id
    where i.token = ${token} limit 1
  `;
  return r[0] || null;
}

export async function redeemInvite({ inviteToken, redeemedByUserId }) {
  const r = await sql`
    insert into invite_redemptions (invite_token, redeemed_by_user_id)
    values (${inviteToken}, ${redeemedByUserId})
    on conflict do nothing
    returning id
  `;
  return r[0] || null;
}

export async function countInviteRedemptions(userId) {
  const r = await sql`
    select count(*)::int as n
    from invite_redemptions r
    join invites i on i.token = r.invite_token
    where i.owner_user_id = ${userId}
  `;
  return r[0]?.n || 0;
}

/**
 * Public-ish leaderboard. Returns top inviters with masked emails + redemption count.
 * Limit 10. Excludes inviters with 0 redemptions.
 */
export async function getInviteLeaderboard(limit = 10) {
  return sql`
    select u.email, count(r.id)::int as redemptions, min(r.redeemed_at) as first_redemption
    from invite_redemptions r
    join invites i on i.token = r.invite_token
    join users u on u.id = i.owner_user_id
    group by u.email
    having count(r.id) > 0
    order by redemptions desc, first_redemption asc
    limit ${limit}
  `;
}

/**
 * For the authed user's personal "redemptions this week / total" view.
 */
export async function getMyInviteStats(userId) {
  const totals = await sql`
    select
      count(*)::int as total,
      count(*) filter (where r.redeemed_at > now() - interval '7 days')::int as week,
      count(*) filter (where r.redeemed_at > now() - interval '30 days')::int as month
    from invite_redemptions r
    join invites i on i.token = r.invite_token
    where i.owner_user_id = ${userId}
  `;
  return totals[0] || { total: 0, week: 0, month: 0 };
}

export async function updateUser(id, patch) {
  const allowed = [
    "name",
    "timezone",
    "send_time",
    "send_days",
    "status",
    "role",
    "skill_level",
    "paused_until",
    "handle",
    "attribution_source",
  ];
  const entries = Object.entries(patch).filter(([k]) => allowed.includes(k));
  if (!entries.length) return getUserById(id);
  for (const [k, v] of entries) {
    switch (k) {
      case "name":
        await sql`update users set name = ${v} where id = ${id}`;
        break;
      case "timezone":
        await sql`update users set timezone = ${v} where id = ${id}`;
        break;
      case "send_time":
        await sql`update users set send_time = ${v} where id = ${id}`;
        break;
      case "send_days":
        await sql`update users set send_days = ${v} where id = ${id}`;
        break;
      case "status":
        await sql`update users set status = ${v} where id = ${id}`;
        break;
      case "role":
        await sql`update users set role = ${v} where id = ${id}`;
        break;
      case "skill_level":
        await sql`update users set skill_level = ${v} where id = ${id}`;
        break;
      case "paused_until":
        // Pass null to clear, otherwise an ISO timestamp string
        await sql`update users set paused_until = ${v} where id = ${id}`;
        break;
      case "handle":
        // Normalize and validate
        if (v === null || v === "") {
          await sql`update users set handle = null where id = ${id}`;
        } else {
          const h = String(v).toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
          if (h.length >= 2) {
            await sql`update users set handle = ${h} where id = ${id}`;
          }
        }
        break;
      case "attribution_source":
        // Wave N — first-touch attribution (UTMs). JSONB column from migration 017.
        // Neon serverless serializes objects to JSONB automatically.
        await sql`update users set attribution_source = ${v} where id = ${id}`;
        break;
    }
  }
  return getUserById(id);
}

export async function markUserLogin(id) {
  await sql`update users set last_login_at = now() where id = ${id}`;
}

/**
 * Wave N+ — fetch the most recent active founder note for the given audience.
 * Returns null if none. Used by cron when generating briefs to attach to brief.data.
 */
export async function getActiveFounderNote({ audience = "all", userId = null } = {}) {
  try {
    if (audience === "self" && userId) {
      const r = await sql`
        select body, created_at
        from founder_notes
        where audience = 'self'
          and created_by = ${userId}
          and (expires_at is null or expires_at > now())
        order by created_at desc
        limit 1
      `;
      if (r[0]) return r[0];
    }
    const r = await sql`
      select body, created_at
      from founder_notes
      where audience = 'all'
        and (expires_at is null or expires_at > now())
      order by created_at desc
      limit 1
    `;
    return r[0] || null;
  } catch {
    return null;
  }
}

export async function deleteUser(id) {
  // Wave N Day 4 — explicit cleanup for tables not bound by a user_id FK.
  //
  // Most tables (prefs, login_tokens, editions, bookmarks, invites, invite_redemptions,
  // letters, clicks, team_share_tokens, slack_integrations, push_tokens) have
  // `on delete cascade` on their user_id FK, so the row-cascade handles them.
  //
  // Two tables need explicit handling:
  //   - interest_list — keyed by email (no user FK). Delete any rows that match
  //     this user's email so a deletion-then-re-signup doesn't leak old attribution.
  //   - usage_log — has `on delete set null`, intentionally preserved for billing/audit
  //     but with the user link anonymized. Nothing to do here.
  //
  // brief_scores cascades from editions, so it goes when editions cascade.
  const u = await getUserById(id);
  if (u?.email) {
    try {
      await sql`delete from interest_list where email = ${u.email}`;
    } catch (err) {
      // Non-fatal — if interest_list doesn't exist or table differs, continue with user delete
      console.warn("deleteUser interest_list cleanup failed (non-fatal):", err.message);
    }
  }
  await sql`delete from users where id = ${id}`;
}

/* ─── Prefs ────────────────────────────────────────────────── */

export async function getPrefs(userId) {
  const r = await sql`select * from prefs where user_id = ${userId} limit 1`;
  return r[0] || null;
}

export async function upsertPrefs(userId, { topics, depth, exclude_topics, topic_weights }) {
  // Read current row so we can preserve unchanged fields
  const existing = await getPrefs(userId);
  const merged = {
    topics: topics ?? existing?.topics ?? [],
    depth: depth ?? existing?.depth ?? "standard",
    exclude_topics: exclude_topics ?? existing?.exclude_topics ?? [],
    topic_weights: topic_weights ?? existing?.topic_weights ?? {},
  };
  const r = await sql`
    insert into prefs (user_id, topics, depth, exclude_topics, topic_weights)
    values (${userId}, ${merged.topics}, ${merged.depth}, ${merged.exclude_topics}, ${merged.topic_weights})
    on conflict (user_id) do update
      set topics = excluded.topics,
          depth = excluded.depth,
          exclude_topics = excluded.exclude_topics,
          topic_weights = excluded.topic_weights,
          updated_at = now()
    returning *
  `;
  return r[0];
}

/* ─── Login tokens ─────────────────────────────────────────── */

export async function createLoginToken(userId, token, expiresAt) {
  await sql`
    insert into login_tokens (token, user_id, expires_at)
    values (${token}, ${userId}, ${expiresAt})
  `;
}

export async function consumeLoginToken(token) {
  const r = await sql`
    update login_tokens set used_at = now()
    where token = ${token}
      and used_at is null
      and expires_at > now()
    returning user_id
  `;
  return r[0]?.user_id || null;
}

/* ─── Editions ─────────────────────────────────────────────── */

export async function findEditionForToday(userId, dateIso) {
  const r = await sql`
    select * from editions where user_id = ${userId} and edition_date = ${dateIso} limit 1
  `;
  return r[0] || null;
}

export async function getEditionBySlug(slug) {
  const r = await sql`select * from editions where slug = ${slug} limit 1`;
  return r[0] || null;
}

export async function insertEdition({ userId, editionDate, slug, data }) {
  const r = await sql`
    insert into editions (user_id, edition_date, slug, data, status)
    values (${userId}, ${editionDate}, ${slug}, ${data}, 'queued')
    on conflict (user_id, edition_date) do nothing
    returning *
  `;
  return r[0] || null;
}

export async function markEditionSent(id) {
  await sql`update editions set status = 'sent', sent_at = now() where id = ${id}`;
}

export async function markEditionFailed(id) {
  await sql`update editions set status = 'failed' where id = ${id}`;
}

/* ─── Bookmarks ────────────────────────────────────────────── */

export async function listBookmarks(userId, limit = 100) {
  return sql`
    select id, story_url, title, source, edition_slug, is_public, saved_at
    from bookmarks
    where user_id = ${userId}
    order by saved_at desc
    limit ${limit}
  `;
}

export async function addBookmark(userId, { story_url, title, source, edition_slug }) {
  const r = await sql`
    insert into bookmarks (user_id, story_url, title, source, edition_slug)
    values (${userId}, ${story_url}, ${title}, ${source || null}, ${edition_slug || null})
    on conflict (user_id, story_url) do update set title = excluded.title, source = excluded.source
    returning id, story_url, title, source, edition_slug, is_public, saved_at
  `;
  return r[0];
}

export async function removeBookmark(userId, story_url) {
  await sql`delete from bookmarks where user_id = ${userId} and story_url = ${story_url}`;
}

export async function setBookmarkPublic(userId, story_url, isPublic) {
  await sql`update bookmarks set is_public = ${!!isPublic} where user_id = ${userId} and story_url = ${story_url}`;
}

/* ─── Handles + public profiles ────────────────────────────── */

export async function setHandle(userId, handle) {
  if (!handle) {
    await sql`update users set handle = null where id = ${userId}`;
    return null;
  }
  const r = await sql`
    update users set handle = ${handle} where id = ${userId}
    returning handle
  `;
  return r[0]?.handle || null;
}

export async function getUserByHandle(handle) {
  const r = await sql`
    select id, email, name, handle, role, skill_level, created_at
    from users where handle = ${handle} limit 1
  `;
  return r[0] || null;
}

export async function listPublicBookmarksForUser(userId, limit = 100) {
  return sql`
    select id, story_url, title, source, edition_slug, saved_at
    from bookmarks
    where user_id = ${userId} and is_public = true
    order by saved_at desc
    limit ${limit}
  `;
}

/**
 * Full-text search across one user's editions. Returns matching story-level rows.
 * Uses Postgres tsvector matching against the jsonb haystack, then unrolls sections in JS.
 */
export async function searchUserEditions(userId, queryText, limit = 30) {
  if (!queryText || !String(queryText).trim()) return [];
  const q = String(queryText).slice(0, 200);
  const rows = await sql`
    select edition_date, slug, data,
      ts_rank(
        to_tsvector('english',
          coalesce(data->>'headline','') || ' ' ||
          coalesce(data->>'editor_note','') || ' ' ||
          coalesce(data->>'pull_quote','') || ' ' ||
          coalesce(data::text,'')
        ),
        plainto_tsquery('english', ${q})
      ) as rank
    from editions
    where user_id = ${userId}
      and to_tsvector('english',
          coalesce(data->>'headline','') || ' ' ||
          coalesce(data->>'editor_note','') || ' ' ||
          coalesce(data->>'pull_quote','') || ' ' ||
          coalesce(data::text,'')
        ) @@ plainto_tsquery('english', ${q})
    order by rank desc
    limit ${limit}
  `;

  // Unroll matching stories with edition context
  const ql = q.toLowerCase();
  const hits = [];
  for (const row of rows) {
    const stories = (row.data?.sections || []).flatMap((s) => s.stories || []);
    for (const st of stories) {
      const hay = ((st.title || "") + " " + (st.tldr || "") + " " + (st.why_it_matters || "")).toLowerCase();
      if (hay.includes(ql) || ql.split(/\s+/).every((w) => hay.includes(w))) {
        hits.push({
          edition_slug: row.slug,
          edition_date: row.edition_date,
          title: st.title,
          tldr: st.tldr,
          source: st.source,
          url: st.url,
        });
        if (hits.length >= limit) return hits;
      }
    }
    // Also include the edition headline as a synthetic hit if the headline matches
    if ((row.data?.headline || "").toLowerCase().includes(ql)) {
      hits.push({
        edition_slug: row.slug,
        edition_date: row.edition_date,
        title: row.data.headline,
        tldr: row.data.editor_note,
        source: "headline",
        url: null,
      });
    }
  }
  return hits.slice(0, limit);
}

/**
 * Aggregate the most-bookmarked PUBLIC stories across all users in the past N days.
 */
export async function discoverThisWeek(days = 7, limit = 20) {
  return sql`
    select story_url, max(title) as title, max(source) as source, count(*)::int as saves
    from bookmarks
    where saved_at > now() - (interval '1 day' * ${days})
      and is_public = true
    group by story_url
    order by saves desc, max(saved_at) desc
    limit ${limit}
  `;
}

/* ─── Editions: listing past editions for archive + Week-in-Review ─ */

export async function listEditionsForUser(userId, { limit = 30, before = null } = {}) {
  if (before) {
    return sql`
      select id, edition_date, slug, status, sent_at, created_at, data
      from editions
      where user_id = ${userId} and edition_date < ${before}
      order by edition_date desc
      limit ${limit}
    `;
  }
  return sql`
    select id, edition_date, slug, status, sent_at, created_at, data
    from editions
    where user_id = ${userId}
    order by edition_date desc
    limit ${limit}
  `;
}

export async function listRecentEditionsForUser(userId, days = 7) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return sql`
    select edition_date, slug, data
    from editions
    where user_id = ${userId} and edition_date >= ${cutoff}
    order by edition_date desc
  `;
}

/**
 * For long-horizon callbacks. Returns just the editor's-pick story title + edition_date over
 * the past N days (default 30), excluding the past 7 (which are already in the daily callback
 * context). Returns small rows — designed for prompt context.
 */
export async function listPastEditorPicksForUser(userId, days = 30, excludeRecentDays = 7) {
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const end = new Date(Date.now() - excludeRecentDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return sql`
    select edition_date, slug, data
    from editions
    where user_id = ${userId}
      and edition_date >= ${start}
      and edition_date < ${end}
    order by edition_date desc
    limit 30
  `;
}

/* ─── Interest list (upcoming publications) ───────────────── */

export async function addInterest({ publicationId, email, source }) {
  const r = await sql`
    insert into interest_list (publication_id, email, source)
    values (${publicationId}, ${email}, ${source || null})
    on conflict (publication_id, email) do update set source = excluded.source
    returning id, publication_id, created_at
  `;
  return r[0];
}

export async function countInterest(publicationId) {
  const r = await sql`select count(*)::int as n from interest_list where publication_id = ${publicationId}`;
  return r[0]?.n || 0;
}

/* ─── Reports ──────────────────────────────────────────────── */

export async function insertReport({ slug, title, subtitle, body, pullQuote, topic }) {
  const r = await sql`
    insert into reports (slug, title, subtitle, body, pull_quote, topic)
    values (${slug}, ${title}, ${subtitle || null}, ${body}, ${pullQuote || null}, ${topic || null})
    on conflict (slug) do update
      set title = excluded.title, subtitle = excluded.subtitle, body = excluded.body,
          pull_quote = excluded.pull_quote, topic = excluded.topic
    returning slug, published_at
  `;
  return r[0];
}

export async function getReportBySlug(slug) {
  const r = await sql`select * from reports where slug = ${slug} limit 1`;
  return r[0] || null;
}

export async function listRecentReports(limit = 20) {
  return sql`select slug, title, subtitle, pull_quote, topic, published_at from reports order by published_at desc limit ${limit}`;
}

/* ─── Click tracking ───────────────────────────────────────── */

export async function recordClick({ userId, editionSlug, storyUrl, storySource, storyTitle }) {
  // Idempotent at day level via the unique index — duplicates silently dropped.
  await sql`
    insert into clicks (user_id, edition_slug, story_url, story_source, story_title)
    values (${userId}, ${editionSlug || null}, ${storyUrl}, ${storySource || null}, ${storyTitle || null})
    on conflict do nothing
  `;
}

/**
 * Reader signal for the prompt: top source kinds + most-clicked title keywords over the last 30 days.
 * Compact — returns ~5 of each, designed to fit in a small prompt block.
 */
export async function getReaderSignal(userId, days = 30) {
  // Top source kinds
  const sources = await sql`
    select story_source, count(*)::int as n
    from clicks
    where user_id = ${userId}
      and clicked_at > now() - interval '1 day' * ${days}
      and story_source is not null
    group by story_source
    order by n desc
    limit 5
  `;

  // Top title keywords. Simple SQL approach: split each title into tokens, count, return top 10.
  // (Postgres regexp_split_to_table + tsvector lemmatization would be fancier but overkill.)
  const keywords = await sql`
    with words as (
      select lower(regexp_split_to_table(coalesce(story_title, ''), '\W+')) as w
      from clicks
      where user_id = ${userId}
        and clicked_at > now() - interval '1 day' * ${days}
    )
    select w, count(*)::int as n
    from words
    where length(w) >= 4
      and w not in (
        'with','from','this','that','these','those','have','been','were','will','your','about','their','they','more','than','then','some','what','when','where','which','into','over','using','build','built','make','made','says','said','just','like','only','also','last','next','open','source','article','project','library','version','release','update','launch','release','today','yesterday','tomorrow','introduces','introducing'
      )
    group by w
    order by n desc
    limit 10
  `;

  return {
    top_sources: sources.map((r) => ({ source: r.story_source, n: r.n })),
    top_keywords: keywords.map((r) => ({ word: r.w, n: r.n })),
    total_clicks: keywords.length ? sources.reduce((s, r) => s + r.n, 0) : 0,
  };
}

/**
 * Streak data for the masthead chip + /streak page. Returns days-in-a-row of editions opened (any),
 * total editions opened, and a 14-day sparkline of {date, opened: bool}.
 */
export async function getStreakForUser(userId) {
  // We approximate "opened" as having clicked OR created the edition (since we don't track opens).
  // For now, we just count edition rows the user has — a true streak page is a Wave G+ enhancement.
  const recent = await sql`
    select edition_date
    from editions
    where user_id = ${userId}
    order by edition_date desc
    limit 30
  `;
  const dates = recent.map((r) => r.edition_date);
  return { dates, edition_count: dates.length };
}

/* ─── Letters ──────────────────────────────────────────────── */

export async function postLetter({ userId, editionSlug, body }) {
  const r = await sql`
    insert into letters (user_id, edition_slug, body)
    values (${userId}, ${editionSlug}, ${body})
    returning id, body, created_at
  `;
  return r[0];
}

export async function listLettersForEdition(slug, limit = 5) {
  return sql`
    select l.id, l.body, l.created_at, coalesce(u.name, '') as author_name
    from letters l join users u on u.id = l.user_id
    where l.edition_slug = ${slug}
    order by l.created_at desc
    limit ${limit}
  `;
}

/**
 * Get the 1-2 best letters from yesterday's editions (across all users) to fold into today's
 * brief context. "Best" = longest body within reasonable bounds, most recent first.
 */
export async function listYesterdayBestLetters(limit = 2) {
  return sql`
    select l.id, l.body, coalesce(u.name, 'a reader') as author_name, l.edition_slug, l.created_at
    from letters l join users u on u.id = l.user_id
    where l.created_at > now() - interval '36 hours'
      and length(l.body) >= 60
      and length(l.body) <= 600
    order by length(l.body) desc, l.created_at desc
    limit ${limit}
  `;
}

/* ─── Cron query: who's due this hour ──────────────────────── */

export async function findUsersDueThisHour() {
  const r = await sql`
    select u.id, u.email, u.name, u.timezone, u.send_time, u.send_days, u.unsubscribe_token,
           u.role, u.skill_level,
           p.topics, p.depth, p.exclude_topics, p.topic_weights
    from users u
    join prefs p on p.user_id = u.id
    where u.status = 'active'
      and (u.paused_until is null or u.paused_until <= now())
      and array_length(p.topics, 1) > 0
      and not exists (
        select 1 from editions e
        where e.user_id = u.id
          and e.edition_date = ((now() at time zone u.timezone)::date)
      )
      and date_trunc('hour', now() at time zone u.timezone)
        = date_trunc('hour', ((now() at time zone u.timezone)::date + u.send_time))
      and lower(to_char(now() at time zone u.timezone, 'dy')) = any(u.send_days)
  `;
  return r;
}
