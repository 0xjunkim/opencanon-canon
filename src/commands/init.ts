import { Command } from "commander"
import { resolve, join } from "node:path"
import { mkdirSync, writeFileSync, existsSync } from "node:fs"
import { conventionsTemplate } from "../templates/conventions.js"
import type { CanonConfig } from "../core/types.js"

export const initCommand = new Command("init")
  .description("Scaffold a new canon worldbuilding repo")
  .argument("[dir]", "target directory", ".")
  .action((dir: string) => {
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

    const rcPath = join(root, ".canonrc.json")
    if (!existsSync(rcPath)) {
      const config: CanonConfig = {
        schema_version: "canonrc.v1",
        author: "",
        default_lang: "ko",
      }
      writeFileSync(rcPath, JSON.stringify(config, null, 2) + "\n")
    }

    console.log("Canon repo initialized:")
    console.log("  canon/characters/")
    console.log("  canon/worldbuilding/locations/")
    console.log("  stories/")
    console.log("  CONVENTIONS.md")
    console.log("  .canonrc.json")
  })
