import { Command } from "commander"
import { resolve } from "node:path"
import { existsSync } from "node:fs"
import { loadRepoFromFs } from "../adapters/fs.js"
import { validateRepo } from "../core/validate.js"

export const checkCommand = new Command("check")
  .description("Run canon compliance checks against a repo")
  .argument("[dir]", "repo root directory", ".")
  .action((dir: string) => {
    const repoRoot = resolve(dir)

    if (!existsSync(repoRoot)) {
      console.error(`Error: directory not found: ${repoRoot}`)
      process.exit(1)
    }

    let model
    try {
      model = loadRepoFromFs(repoRoot)
    } catch (err) {
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

    // Slug ↔ metadata.id mismatch advisory (v0.2.3, enforced in v0.3.0)
    for (const [slug, { meta }] of model.stories) {
      if (typeof meta.id === "string" && slug !== meta.id) {
        console.warn(`  warning: directory "${slug}" ≠ metadata.id "${meta.id}" (will be enforced in v0.3.0)`)
      }
    }

    if (report.passingStories < report.totalStories) {
      process.exit(1)
    }
  })
