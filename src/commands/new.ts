import { Command } from "commander"
import { resolve, join } from "node:path"
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs"
import { metadataTemplate } from "../templates/metadata.js"
import { characterTemplate } from "../templates/character.js"
import { locationTemplate } from "../templates/location.js"

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/

function validateSlug(value: string): string {
  if (!SLUG_RE.test(value)) {
    console.error(`Error: invalid id "${value}". Must match ${SLUG_RE} (lowercase alphanumeric, hyphens, underscores, no leading special chars).`)
    process.exit(1)
  }
  if (value.includes("..")) {
    console.error(`Error: id must not contain ".."`)
    process.exit(1)
  }
  return value
}

export const newCommand = new Command("new")
  .description("Create a new story, character, or location from template")
  .argument("<type>", "entity type: story, character, or location")
  .argument("<id>", "slug/id for the new entity")
  .option("-d, --dir <dir>", "repo root directory", ".")
  .action((type: string, id: string, opts: { dir: string }) => {
    const slug = validateSlug(id)
    const root = resolve(opts.dir)

    switch (type) {
      case "story": {
        const storyDir = join(root, "stories", slug)
        if (existsSync(storyDir)) {
          console.error(`Error: stories/${slug} already exists`)
          process.exit(1)
        }
        // Read contributor from .canonrc.json author field
        let contributor = ""
        const rcPath = join(root, ".canonrc.json")
        if (existsSync(rcPath)) {
          try {
            const rc = JSON.parse(readFileSync(rcPath, "utf-8"))
            contributor = rc.author || ""
          } catch { /* ignore malformed rc */ }
        }
        mkdirSync(storyDir, { recursive: true })
        writeFileSync(join(storyDir, "metadata.json"), metadataTemplate(slug, contributor))
        console.log(`Created stories/${slug}/metadata.json`)
        break
      }
      case "character": {
        const charDir = join(root, "canon", "characters", slug)
        if (existsSync(charDir)) {
          console.error(`Error: canon/characters/${slug} already exists`)
          process.exit(1)
        }
        mkdirSync(charDir, { recursive: true })
        writeFileSync(join(charDir, "definition.json"), characterTemplate(slug))
        console.log(`Created canon/characters/${slug}/definition.json`)
        break
      }
      case "location": {
        const locPath = join(root, "canon", "worldbuilding", "locations", `${slug}.json`)
        if (existsSync(locPath)) {
          console.error(`Error: canon/worldbuilding/locations/${slug}.json already exists`)
          process.exit(1)
        }
        mkdirSync(join(root, "canon", "worldbuilding", "locations"), { recursive: true })
        writeFileSync(locPath, locationTemplate(slug))
        console.log(`Created canon/worldbuilding/locations/${slug}.json`)
        break
      }
      default:
        console.error(`Error: unknown type "${type}". Use: story, character, or location`)
        process.exit(1)
    }
  })
