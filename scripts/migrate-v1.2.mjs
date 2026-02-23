#!/usr/bin/env node
/**
 * Migrate metadata.json files from v1.1 → v1.2.
 * Adds contributor field from .canonrc.json author.
 *
 * Usage: node scripts/migrate-v1.2.mjs [repo-root]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] || ".");
const storiesDir = join(root, "stories");

if (!existsSync(storiesDir)) {
  console.error("Error: stories/ not found in", root);
  process.exit(1);
}

// Read contributor from .canonrc.json
let contributor = "";
const rcPath = join(root, ".canonrc.json");
if (existsSync(rcPath)) {
  try {
    const rc = JSON.parse(readFileSync(rcPath, "utf-8"));
    contributor = rc.author || "";
  } catch { /* ignore */ }
}

if (!contributor) {
  console.error("Error: .canonrc.json missing or has no author field.");
  console.error("Set author first: edit .canonrc.json");
  process.exit(1);
}

const slugs = readdirSync(storiesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let migrated = 0;
let skipped = 0;

for (const slug of slugs) {
  const metaPath = join(storiesDir, slug, "metadata.json");
  if (!existsSync(metaPath)) continue;

  const raw = JSON.parse(readFileSync(metaPath, "utf-8"));

  if (raw.schema_version === "1.2" && raw.contributor) {
    skipped++;
    continue;
  }

  raw.schema_version = "1.2";
  if (!raw.contributor) {
    raw.contributor = contributor;
  }

  writeFileSync(metaPath, JSON.stringify(raw, null, 2) + "\n");
  console.log(`  migrated: stories/${slug}/metadata.json`);
  migrated++;
}

console.log(`\nDone. migrated=${migrated}, skipped=${skipped}`);
if (migrated > 0) {
  console.log("Run 'canon check' to verify, then 'canon lock' to update lock.");
}
