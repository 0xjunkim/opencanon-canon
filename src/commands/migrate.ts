import { Command } from "commander"
import { resolve, join } from "node:path"
import { readFileSync, writeFileSync, readdirSync, existsSync, copyFileSync } from "node:fs"

export const migrateCommand = new Command("migrate")
  .description("Migrate story metadata from v1.2 to v1.3")
  .argument("[dir]", "repo root directory", ".")
  .option("--apply", "actually write changes (default: dry-run)")
  .option("--lang <lang>", "canonical language for migrated metadata")
  .action((dir: string, opts: { apply?: boolean; lang?: string }) => {
    const repoRoot = resolve(dir)
    const storiesDir = join(repoRoot, "stories")

    if (!existsSync(storiesDir)) {
      console.error("Error: stories/ directory not found")
      process.exit(1)
    }

    // Determine canonical language
    let lang = opts.lang
    if (!lang) {
      const rcPath = join(repoRoot, ".canonrc.json")
      if (existsSync(rcPath)) {
        try {
          const rc = JSON.parse(readFileSync(rcPath, "utf-8"))
          lang = rc.default_lang
        } catch { /* ignore */ }
      }
    }
    if (!lang) {
      console.error("Error: --lang required (or set default_lang in .canonrc.json)")
      process.exit(1)
    }

    const isDryRun = !opts.apply
    if (isDryRun) {
      console.log("DRY RUN — no files will be modified. Use --apply to write changes.\n")
    }

    const entries = readdirSync(storiesDir, { withFileTypes: true })
    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const metaPath = join(storiesDir, entry.name, "metadata.json")
      if (!existsSync(metaPath)) continue

      let raw: Record<string, unknown>
      try {
        raw = JSON.parse(readFileSync(metaPath, "utf-8"))
      } catch {
        console.error(`  ERROR ${entry.name}: malformed JSON`)
        errors++
        continue
      }

      // Skip if already v1.3 (idempotent)
      if (raw.schema_version === "1.3") {
        console.log(`  SKIP  ${entry.name} (already v1.3)`)
        skipped++
        continue
      }

      // Only v1.2 supported this PR
      if (raw.schema_version !== "1.2") {
        console.error(`  ERROR ${entry.name}: unsupported schema_version "${raw.schema_version}" (only v1.2→v1.3 supported)`)
        errors++
        continue
      }

      // Convert v1.2 → v1.3
      const title = raw.title as { ko?: string; en?: string } | undefined
      const synopsis = raw.synopsis as { ko?: string; en?: string } | undefined

      const v13: Record<string, unknown> = {
        schema_version: "1.3",
        canon_ref: raw.canon_ref,
        id: raw.id,
        episode: raw.episode,
        lang,
        title: title?.[lang as "ko" | "en"] ?? title?.ko ?? title?.en ?? "",
        timeline: raw.timeline,
        synopsis: synopsis?.[lang as "ko" | "en"] ?? synopsis?.ko ?? synopsis?.en ?? "",
        characters: raw.characters,
        locations: raw.locations,
        contributor: raw.contributor,
        canon_status: raw.canon_status,
      }

      // Preserve optional fields
      if (raw.themes) v13.themes = raw.themes
      if (raw.canon_events) v13.canon_events = raw.canon_events
      if (raw.temporal_context) v13.temporal_context = raw.temporal_context

      if (isDryRun) {
        console.log(`  WOULD ${entry.name}: v1.2 → v1.3 (lang=${lang})`)
      } else {
        // Backup original
        const backupPath = metaPath + ".v12.bak"
        copyFileSync(metaPath, backupPath)
        writeFileSync(metaPath, JSON.stringify(v13, null, 2) + "\n")
        console.log(`  DONE  ${entry.name}: v1.2 → v1.3 (backup: metadata.json.v12.bak)`)
      }
      migrated++
    }

    console.log()
    console.log(`${migrated} migrated, ${skipped} skipped, ${errors} errors`)
    if (isDryRun && migrated > 0) {
      console.log("\nRe-run with --apply to write changes.")
    }
    if (errors > 0) {
      process.exit(1)
    }
  })
