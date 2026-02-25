import { Command } from "commander"
import { resolve, join } from "node:path"
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs"
import * as readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { metadataTemplate, type MetadataOptions } from "../templates/metadata.js"
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

function readContributor(root: string): string {
  const rcPath = join(root, ".canonrc.json")
  if (existsSync(rcPath)) {
    try {
      const rc = JSON.parse(readFileSync(rcPath, "utf-8"))
      return rc.author || ""
    } catch { /* ignore malformed rc */ }
  }
  return ""
}

async function promptStoryMetadata(slug: string, contributor: string): Promise<MetadataOptions> {
  const rl = readline.createInterface({ input, output })

  console.log("")
  console.log("캐논은 이야기의 약속이다. 기본 정보를 입력하세요.")
  console.log("(빈칸으로 두면 나중에 metadata.json에서 직접 수정할 수 있습니다)\n")

  const ask = async (prompt: string, fallback = "") => {
    const answer = await rl.question(prompt)
    return answer.trim() || fallback
  }

  const episodeStr = await ask("에피소드 번호 (숫자): ", "0")
  const episode = parseInt(episodeStr, 10) || 0

  const titleKo = await ask("제목 (한국어): ")
  const titleEn = await ask("제목 (영어): ")
  const timeline = await ask("이야기 속 날짜 (YYYY-MM-DD): ", "2025-01-01")
  const synopsisKo = await ask("한 줄 줄거리 (한국어): ")
  const synopsisEn = await ask("한 줄 줄거리 (영어): ")

  const charsInput = await ask("등장 캐릭터 (쉼표 구분, 예: isia,seed): ")
  const characters = charsInput ? charsInput.split(",").map(s => s.trim()).filter(Boolean) : []

  const locsInput = await ask("등장 장소 (쉼표 구분, 예: samsung-b7): ")
  const locations = locsInput ? locsInput.split(",").map(s => s.trim()).filter(Boolean) : []

  const statusInput = await ask("캐논 상태 (canonical/non-canonical) [non-canonical]: ", "non-canonical")
  const canonStatus = statusInput === "canonical" ? "canonical" : "non-canonical"

  rl.close()
  console.log("")

  return { contributor, episode, titleKo, titleEn, timeline, synopsisKo, synopsisEn, characters, locations, canonStatus }
}

export const newCommand = new Command("new")
  .description("Create a new story, character, or location from template")
  .argument("<type>", "entity type: story, character, or location")
  .argument("<id>", "slug/id for the new entity")
  .option("-d, --dir <dir>", "repo root directory", ".")
  .option("-i, --interactive", "interactively fill in story metadata")
  .action(async (type: string, id: string, opts: { dir: string; interactive?: boolean }) => {
    const slug = validateSlug(id)
    const root = resolve(opts.dir)

    switch (type) {
      case "story": {
        const storyDir = join(root, "stories", slug)
        if (existsSync(storyDir)) {
          console.error(`Error: stories/${slug} already exists`)
          process.exit(1)
        }
        const contributor = readContributor(root)
        let metaOpts: MetadataOptions | string = contributor

        if (opts.interactive) {
          metaOpts = await promptStoryMetadata(slug, contributor)
        }

        mkdirSync(storyDir, { recursive: true })
        writeFileSync(join(storyDir, "metadata.json"), metadataTemplate(slug, metaOpts))
        console.log(`Created stories/${slug}/metadata.json`)

        if (opts.interactive) {
          const m = metaOpts as MetadataOptions
          if (m.titleKo || m.synopsisKo) {
            console.log("")
            console.log("다음 단계:")
            console.log(`  1. stories/${slug}/chapter-01.md 파일을 만들고 본문을 씁니다`)
            console.log(`  2. canon/ 디렉토리에 등장 캐릭터/장소가 정의되어 있는지 확인합니다`)
            console.log(`  3. git add -A && git commit -m "[story] ${slug}"`)
            console.log(`  4. canon lock --update-refs`)
            console.log(`  5. canon check`)
          }
        }
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
