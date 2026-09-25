#!/usr/bin/env bash
# Apply the Prisma schema to a remote Turso (libSQL) database.
#
# Why this exists: Prisma's `sqlite` datasource provider rejects `libsql://`
# URLs in the CLI (`prisma db push` fails URL validation), even though the
# @prisma/adapter-libsql driver works at runtime. So to create/sync the
# schema on Turso, we generate the DDL via `prisma migrate diff` and apply
# it with the raw libsql client.
#
# Usage:
#   DATABASE_URL="libsql://....turso.io" \
#   DATABASE_AUTH_TOKEN="...." \
#   bash scripts/sync-turso-schema.sh
#
# Re-run it whenever prisma/schema.prisma changes (idempotent-ish: CREATE
# statements will error on existing tables but the rest still applies).
set -euo pipefail

cd "$(dirname "$0")/.."

: "${DATABASE_URL:?DATABASE_URL must be set to a libsql://… URL}"
: "${DATABASE_AUTH_TOKEN:?DATABASE_AUTH_TOKEN must be set}"

TMP_SQL="$(mktemp)"
trap 'rm -f "$TMP_SQL"' EXIT

echo "→ generating DDL from prisma/schema.prisma…"
bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > "$TMP_SQL"

echo "→ applying DDL to ${DATABASE_URL}…"
DATABASE_URL="$DATABASE_URL" DATABASE_AUTH_TOKEN="$DATABASE_AUTH_TOKEN" bun -e '
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
const c = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.DATABASE_AUTH_TOKEN! });
const sql = readFileSync(process.argv[2], "utf8");
const stmts = sql
  .split(/;\s*\n/)
  .map(s => s.replace(/^\s*--[^\n]*\n/gm, "").trim())
  .filter(s => s.length > 0)
  .map(s => s.endsWith(";") ? s : s + ";");
let ok = 0, skip = 0, fail = 0;
for (const s of stmts) {
  try { await c.execute(s); ok++; }
  catch (e) {
    const m = (e.message || "");
    if (m.includes("already exists")) skip++;
    else { fail++; if (fail <= 3) console.log("  fail:", m.slice(0,120)); }
  }
}
console.log(`✓ applied ${ok}, skipped ${skip} (already existed), failed ${fail}`);
const r = await c.execute("SELECT name FROM sqlite_master WHERE type=? ORDER BY name", ["table"]);
console.log("tables:", r.rows.map(row => row.name).filter(Boolean));
' "$TMP_SQL"
