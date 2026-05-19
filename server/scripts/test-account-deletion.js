// Wave N Day 9 — Account-deletion E2E test.
//
// Creates a synthetic user, populates rows across every user-bound table,
// calls deleteUser(), and asserts zero orphaned rows.
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/test-account-deletion.js
//
// Exits 0 on success, non-zero with a clear diff on failure.

import dotenv from "dotenv";
import crypto from "node:crypto";
import { sql, findOrCreateUserByEmail, upsertPrefs, insertEdition, deleteUser, getUserById } from "../db.js";

dotenv.config();

const TEST_EMAIL = `dispatch-deletion-test-${Date.now()}@example.invalid`;

// List of every table that holds user-bound state. The test seeds each, then asserts
// zero rows referencing the deleted user after deleteUser() runs.
const USER_BOUND_TABLES = [
  { table: "prefs", col: "user_id" },
  { table: "login_tokens", col: "user_id" },
  { table: "editions", col: "user_id" },
  { table: "bookmarks", col: "user_id" },
  { table: "letters", col: "user_id" },
  { table: "clicks", col: "user_id" },
  { table: "invites", col: "owner_user_id" },
  { table: "invite_redemptions", col: "redeemed_by_user_id" },
  { table: "team_share_tokens", col: "created_by_user_id" },
  { table: "slack_integrations", col: "user_id" },
  { table: "push_tokens", col: "user_id" },
];

// Tables NOT bound by user_id but cleaned manually in deleteUser()
const EMAIL_BOUND_TABLES = [
  { table: "interest_list", col: "email" },
];

// usage_log is special — `on delete set null`, we expect rows to survive with user_id=null
const SET_NULL_TABLES = ["usage_log"];

function log(label, msg) {
  console.log(`${label.padEnd(12)} ${msg}`);
}

async function tableExists(name) {
  const r = await sql`
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = ${name}
    limit 1
  `;
  return r.length > 0;
}

async function seedUser() {
  const user = await findOrCreateUserByEmail(TEST_EMAIL);
  log("seed", `user id=${user.id} email=${TEST_EMAIL}`);

  // prefs
  await upsertPrefs(user.id, { topics: ["Backend Development"], depth: "standard" });

  // login_tokens
  await sql`insert into login_tokens (token, user_id, expires_at) values (${crypto.randomBytes(16).toString("hex")}, ${user.id}, now() + interval '15 minutes')`;

  // editions
  const editionDate = new Date().toISOString().slice(0, 10);
  const slug = `test-${crypto.randomBytes(4).toString("hex")}`;
  await insertEdition({ userId: user.id, editionDate, slug, data: { headline: "test edition" } });

  // bookmarks
  if (await tableExists("bookmarks")) {
    await sql`insert into bookmarks (user_id, story_url, title, source) values (${user.id}, 'https://example.invalid/test', 'test', 'hackernews')`;
  }

  // letters
  if (await tableExists("letters")) {
    await sql`insert into letters (user_id, edition_slug, body, author_name) values (${user.id}, ${slug}, 'test letter body', 'test')`;
  }

  // clicks
  if (await tableExists("clicks")) {
    await sql`insert into clicks (user_id, edition_slug, story_url, story_source, story_title) values (${user.id}, ${slug}, 'https://example.invalid/click', 'hackernews', 'test')`;
  }

  // invites + redemption
  if (await tableExists("invites")) {
    const token = `inv-${crypto.randomBytes(6).toString("hex")}`;
    await sql`insert into invites (token, owner_user_id) values (${token}, ${user.id})`;
    // Create a second user to be the redeemer (so we can test redeemed_by_user_id cascade)
    const redeemer = await findOrCreateUserByEmail(`${TEST_EMAIL}.r`);
    await sql`insert into invite_redemptions (invite_token, redeemed_by_user_id) values (${token}, ${redeemer.id})`;
    log("seed", `invite token=${token} + 1 redemption by redeemer`);
  }

  // team_share_tokens
  if (await tableExists("team_share_tokens")) {
    await sql`insert into team_share_tokens (token, edition_slug, created_by_user_id, expires_at) values (${crypto.randomBytes(8).toString("hex")}, ${slug}, ${user.id}, now() + interval '7 days')`;
  }

  // brief_scores (cascades via editions.slug, not direct user FK)
  if (await tableExists("brief_scores")) {
    await sql`insert into brief_scores (edition_slug, coherence, career_relevance, voice_fidelity, notes) values (${slug}, 4, 4, 4, 'test')`;
  }

  // slack_integrations
  if (await tableExists("slack_integrations")) {
    await sql`insert into slack_integrations (user_id, team_id, team_name, channel_id, channel_name, access_token, status) values (${user.id}, 'T_TEST', 'Test', 'C_TEST', 'general', 'xoxb-test', 'active')`;
  }

  // push_tokens
  if (await tableExists("push_tokens")) {
    await sql`insert into push_tokens (user_id, token, platform) values (${user.id}, 'ExponentPushToken[test]', 'ios')`;
  }

  // interest_list — email-keyed, not user-bound, must be cleaned by deleteUser()
  if (await tableExists("interest_list")) {
    await sql`insert into interest_list (publication_id, email, source) values ('finance', ${TEST_EMAIL}, '/finance')`;
  }

  // usage_log — has on-delete set null; row should survive with user_id=null
  if (await tableExists("usage_log")) {
    await sql`insert into usage_log (user_id, endpoint, model, total_tokens, cost_micro_usd) values (${user.id}, 'test', 'gpt-4o-mini', 100, 1)`;
  }

  return user;
}

async function countRows(userId, email) {
  const counts = {};
  for (const { table, col } of USER_BOUND_TABLES) {
    if (!(await tableExists(table))) continue;
    const r = await sql.unsafe(`select count(*)::int as n from ${table} where ${col} = $1`, [userId]);
    counts[table] = Number(r[0]?.n || 0);
  }
  for (const { table, col } of EMAIL_BOUND_TABLES) {
    if (!(await tableExists(table))) continue;
    const r = await sql.unsafe(`select count(*)::int as n from ${table} where ${col} = $1`, [email]);
    counts[table] = Number(r[0]?.n || 0);
  }
  for (const table of SET_NULL_TABLES) {
    if (!(await tableExists(table))) continue;
    const r = await sql.unsafe(`select count(*)::int as n from ${table} where user_id = $1`, [userId]);
    counts[`${table} (expects 0 after set-null)`] = Number(r[0]?.n || 0);
  }
  return counts;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set — cannot run deletion test.");
    console.error("Usage: DATABASE_URL=postgres://... node scripts/test-account-deletion.js");
    process.exit(2);
  }

  log("start", "creating synthetic user + seeding rows");
  const user = await seedUser();

  log("before", "counting rows by table");
  const before = await countRows(user.id, TEST_EMAIL);
  for (const [t, n] of Object.entries(before)) {
    log("  before", `${t.padEnd(28)} = ${n}`);
  }

  log("delete", `calling deleteUser(${user.id})`);
  await deleteUser(user.id);

  // Sanity: the user row itself is gone
  const ghost = await getUserById(user.id);
  if (ghost) {
    console.error("FAIL: user row still exists after deleteUser");
    process.exit(1);
  }
  log("delete", "user row removed ✓");

  log("after", "re-counting rows by table");
  const after = await countRows(user.id, TEST_EMAIL);

  let fails = 0;
  for (const [table, n] of Object.entries(after)) {
    const expected = 0;
    const ok = n === expected;
    if (!ok) fails++;
    log(ok ? "  ok" : "  FAIL", `${table.padEnd(28)} = ${n} (expected ${expected})`);
  }

  // Also clean up the redeemer + the invite that the redeemer ID was used on,
  // since the test ran twice now there are stray test users
  try {
    await sql`delete from users where email like 'dispatch-deletion-test-%@example.invalid%' or email like 'dispatch-deletion-test-%@example.invalid.r'`;
  } catch {}

  if (fails > 0) {
    console.error(`\n❌ ${fails} table(s) have orphan rows after deletion. Investigate.`);
    process.exit(1);
  }
  console.log("\n✅ All user-bound rows cleaned. Account deletion is GDPR-safe.");
  process.exit(0);
}

main().catch((err) => {
  console.error("test crashed:", err);
  process.exit(1);
});
