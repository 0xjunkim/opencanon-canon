import { Command } from "commander"
import { resolve, join } from "node:path"
import { mkdirSync, writeFileSync, existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { conventionsTemplate } from "../templates/conventions.js"
import { gettingStartedTemplate } from "../templates/getting-started.js"
import type { CanonConfig } from "../core/types.js"

function detectAuthor(): string {
  try {
    return execSync("git config user.name", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
  } catch {
    return ""
  }
}

export const initCommand = new Command("init")
  .description("Scaffold a new canon worldbuilding repo")
  .argument("[dir]", "target directory", ".")
  .option("--author <name>", "author name (defaults to git config user.name)")
  .action((dir: string, opts: { author?: string }) => {
    const root = resolve(dir)

    const dirs = [
      join(root, "canon", "characters"),
      join(root, "canon", "worldbuilding", "locations"),
      join(root, "stories"),
    ]

    for (const d of dirs) {
      mkdirSync(d, { recursive: true })
    }

    const conventions = join(root, "CONVENTIONS.md")
    if (!existsSync(conventions)) {
      writeFileSync(conventions, conventionsTemplate())
    }

    const author = opts.author ?? detectAuthor()

    const rcPath = join(root, ".canonrc.json")
    if (!existsSync(rcPath)) {
      const config: CanonConfig = {
        schema_version: "canonrc.v1",
        author,
        default_lang: "ko",
      }
      writeFileSync(rcPath, JSON.stringify(config, null, 2) + "\n")
    }

    const gettingStartedPath = join(root, "GETTING-STARTED.md")
    if (!existsSync(gettingStartedPath)) {
      writeFileSync(gettingStartedPath, gettingStartedTemplate(author))
    }

    console.log("Canon repo initialized:")
    console.log("  canon/characters/")
    console.log("  canon/worldbuilding/locations/")
    console.log("  stories/")
    console.log("  CONVENTIONS.md")
    console.log("  GETTING-STARTED.md")
    console.log("  .canonrc.json")
  })
