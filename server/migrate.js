import { neon } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "migrations");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL missing");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);

  await sql`create table if not exists _migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`;

  const applied = new Set((await sql`select name from _migrations`).map((r) => r.name));
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

  for (const f of files) {
    if (applied.has(f)) {
      console.log(`· skipping ${f} (already applied)`);
      continue;
    }
    const body = await readFile(join(MIGRATIONS_DIR, f), "utf8");
    console.log(`→ applying ${f}`);
    // Neon serverless only supports tagged-template; for raw SQL use the .query() form
    await sql.unsafe(body);
    await sql`insert into _migrations (name) values (${f})`;
    console.log(`✓ applied ${f}`);
  }
  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
