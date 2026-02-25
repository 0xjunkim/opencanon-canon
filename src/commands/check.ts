import { Command } from "commander"
import { resolve } from "node:path"
import { existsSync } from "node:fs"
import { loadRepoFromFs } from "../adapters/fs.js"
import { loadRepoFromFsAny } from "../adapters/fs.js"
import { validateRepo } from "../core/validate.js"
import { validateRepoAny } from "../core/validate.js"
import { SchemaVersionError } from "../core/contract.js"

export const checkCommand = new Command("check")
  .description("Run canon compliance checks against a repo")
  .argument("[dir]", "repo root directory", ".")
  .option("--schema <version>", "metadata schema version to validate against")
  .action((dir: string, opts: { schema?: string }) => {
    const repoRoot = resolve(dir)

    if (!existsSync(repoRoot)) {
      console.error(`Error: directory not found: ${repoRoot}`)
      process.exit(1)
    }

    // opt-in v1.3 path
    if (opts.schema === "v1.3" || opts.schema === "1.3") {
      let model
      try {
        model = loadRepoFromFsAny(repoRoot)
      } catch (err) {
        console.error(`Error: failed to read repo: ${err instanceof Error ? err.message : err}`)
        process.exit(1)
      }

      const report = validateRepoAny(model)

      if (report.totalStories === 0) {
        console.error("Error: no stories found in stories/")
        process.exit(1)
      }

      for (const story of report.stories) {
        const icon = story.allPass ? "\u2713" : "\u2717"
        console.log(`${icon} ${story.storyId}`)
        for (const c of story.checks) {
          const mark = c.pass ? "  \u2713" : "  \u2717"
          const msg = c.message ? ` — ${c.message}` : ""
          console.log(`${mark} ${c.id}${msg}`)
        }
      }

      console.log()
      console.log(`${report.passingStories}/${report.totalStories} stories passing`)

      if (report.passingStories < report.totalStories) {
        process.exit(1)
      }
      return
    }

    // default v1.2 path (frozen)
    let model
    try {
      model = loadRepoFromFs(repoRoot)
    } catch (err) {
      // fail-closed: v1.3 metadata detected on default path
      if (err instanceof SchemaVersionError && String(err.actual) === "1.3") {
        console.error(`Error: v1.3 metadata detected; rerun with --schema v1.3`)
        process.exit(1)
      }
      console.error(`Error: failed to read repo: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }

    const report = validateRepo(model)

    if (report.totalStories === 0) {
      console.error("Error: no stories found in stories/")
      process.exit(1)
    }

    for (const story of report.stories) {
      const icon = story.allPass ? "\u2713" : "\u2717"
      console.log(`${icon} ${story.storyId}`)
      for (const c of story.checks) {
        const mark = c.pass ? "  \u2713" : "  \u2717"
        const msg = c.message ? ` — ${c.message}` : ""
        console.log(`${mark} ${c.id}${msg}`)
      }
    }

    console.log()
    console.log(`${report.passingStories}/${report.totalStories} stories passing`)

    if (report.passingStories < report.totalStories) {
      process.exit(1)
    }
  })
