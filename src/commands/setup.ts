import { Command } from "commander"
import { resolve, join } from "node:path"
import { mkdirSync, writeFileSync, existsSync } from "node:fs"
import { execSync } from "node:child_process"
import * as readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { conventionsTemplate } from "../templates/conventions.js"
import { gettingStartedTemplate } from "../templates/getting-started.js"
import { metadataTemplate } from "../templates/metadata.js"
import { characterTemplate } from "../templates/character.js"
import { locationTemplate } from "../templates/location.js"
import type { CanonConfig } from "../core/types.js"

function toSlug(str: string): string {
  // Lowercase, replace spaces with hyphens, remove non-alphanumeric (keep hyphens/underscores)
  const slug = str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "")
    .replace(/^[-_]+|[-_]+$/g, "")
  return slug || "protagonist"
}

function detectAuthor(): string {
  try {
    return execSync("git config user.name", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
  } catch {
    return ""
  }
}

function extractYear(text: string): string {
  const match = text.match(/\b(19|20|21)\d{2}\b/)
  return match ? match[0] : "2030"
}

function inferLocation(text: string): string {
  // Simple keyword extraction for location hints
  const lowerText = text.toLowerCase()
  const locations: Record<string, string> = {
    "우주": "space-station",
    "space": "space-station",
    "서울": "seoul",
    "seoul": "seoul",
    "미래": "future-city",
    "future": "future-city",
    "판타지": "fantasy-realm",
    "fantasy": "fantasy-realm",
    "바다": "ocean",
    "ocean": "ocean",
    "숲": "forest",
    "forest": "forest",
    "학교": "school",
    "school": "school",
    "현대": "modern-city",
  }
  for (const [keyword, slug] of Object.entries(locations)) {
    if (lowerText.includes(keyword)) return slug
  }
  return "unknown-place"
}

function buildChapter(opts: {
  characterName: string
  characterSlug: string
  locationSlug: string
  novelTitle: string
  titleKo: string
  genre: string
  worldview: string
  keyword: string
  year: string
}): string {
  const { characterName, locationSlug, novelTitle, genre, worldview, keyword } = opts

  return `# ${novelTitle}

---

> *장르: ${genre}*
> *키워드: ${keyword}*

---

${worldview}

그 시작은 언제나 그렇듯, 아무도 모르는 곳에서 일어났다.

**${characterName}**은/는 ${locationSlug.replace(/-/g, " ")}에 있었다.

무언가가 달라져 있었다. 설명할 수 없었지만, 분명히 느꼈다.

---

*[여기서부터 이야기를 이어가세요]*
`
}

export const setupCommand = new Command("setup")
  .description("Interactive wizard: scaffold repo, build world, write ep01")
  .argument("[dir]", "target directory", ".")
  .action(async (dir: string) => {
    const root = resolve(dir)
    const rl = readline.createInterface({ input, output })

    const ask = async (prompt: string, fallback = "") => {
      const answer = await rl.question(prompt)
      return answer.trim() || fallback
    }

    // ─── Step 0: git init ─────────────────────────────────────────────────────
    const gitDir = join(root, ".git")
    if (!existsSync(gitDir)) {
      console.log("")
      execSync("git init", { cwd: root, stdio: "inherit" })
    }
    const author = detectAuthor()

    // ─── Step A: Novel questions ───────────────────────────────────────────────
    console.log("")
    console.log("[Opencanon] 소설 집필을 시작합니다. 아래 질문에 편하게 답해주세요:")
    console.log("")

    const novelTitle = await ask("1. 소설 제목은 무엇인가요? ")
    const characterName = await ask("2. 주인공의 이름은 무엇인가요? ")
    // If name can't be slugified (e.g. Korean), ask for an ID
    const rawSlug = toSlug(characterName)
    let characterId = rawSlug
    if (!rawSlug || rawSlug === "protagonist") {
      characterId = await ask(`   영문 ID 또는 로마자 이름을 알려주세요 (예: isia, jun, mia): `, "protagonist")
    }
    const genre = await ask("3. 어떤 장르인가요? (예: SF, 판타지, 현대물, 로맨스) ")
    const worldview = await ask("4. 줄거리나 배경을 편하게 적어주세요\n   (시대 배경, 갈등구조, 사랑이야기, 인간승리 등): ")

    // ─── Step B: Keyword ──────────────────────────────────────────────────────
    console.log("")
    console.log("소설의 뼈대가 완성되었습니다.")
    const keyword = await ask("이 소설에 심어줄 하나의 키워드는 무엇인가요?\n(상처, 고통, 아름다움, 즐거움, 연결, ...): ")

    rl.close()

    // ─── Step C: Generate everything ──────────────────────────────────────────
    console.log("")
    console.log("소설을 생성하고 있습니다...")
    console.log("")

    const characterSlug = characterId || "protagonist"
    const locationSlug = inferLocation(worldview + " " + genre)
    const year = extractYear(worldview)
    const worldTitle = novelTitle || (characterName ? `${characterName}의 소설` : "나의 소설")
    const repoSlug = toSlug(worldTitle) || "my-novel"
    const timeline = `${year}-01-01`

    // Scaffold dirs
    const dirs = [
      join(root, "canon", "characters"),
      join(root, "canon", "worldbuilding", "locations"),
      join(root, "stories"),
    ]
    for (const d of dirs) mkdirSync(d, { recursive: true })

    // CONVENTIONS.md
    if (!existsSync(join(root, "CONVENTIONS.md"))) {
      writeFileSync(join(root, "CONVENTIONS.md"), conventionsTemplate())
    }

    // GETTING-STARTED.md
    if (!existsSync(join(root, "GETTING-STARTED.md"))) {
      writeFileSync(join(root, "GETTING-STARTED.md"), gettingStartedTemplate(author))
    }

    // .canonrc.json
    const rcPath = join(root, ".canonrc.json")
    if (!existsSync(rcPath)) {
      const config: CanonConfig = {
        schema_version: "canonrc.v1",
        author: author || characterSlug,
        default_lang: "ko",
      }
      writeFileSync(rcPath, JSON.stringify(config, null, 2) + "\n")
    }

    // Character
    const charDir = join(root, "canon", "characters", characterSlug)
    if (!existsSync(charDir)) {
      mkdirSync(charDir, { recursive: true })
      writeFileSync(join(charDir, "definition.json"), characterTemplate(characterSlug))
      console.log(`  ✓ 캐릭터 생성: ${characterSlug}`)
    }

    // Location
    const locPath = join(root, "canon", "worldbuilding", "locations", `${locationSlug}.json`)
    if (!existsSync(locPath)) {
      writeFileSync(locPath, locationTemplate(locationSlug))
      console.log(`  ✓ 장소 생성: ${locationSlug}`)
    }

    // ep01 metadata
    const ep01Slug = "ep01-beginning"
    const storyDir = join(root, "stories", ep01Slug)
    mkdirSync(storyDir, { recursive: true })

    const contributor = author || characterSlug
    const synopsisKo = worldview.slice(0, 140) || `${characterName}의 이야기가 시작된다.`
    const synopsisEn = `The story of ${characterName} begins.`
    const titleKo = novelTitle || `${characterName}의 시작`
    const titleEn = `${novelTitle || `The Beginning of ${characterName}`}`

    writeFileSync(
      join(storyDir, "metadata.json"),
      metadataTemplate(ep01Slug, {
        contributor,
        episode: 1,
        titleKo,
        titleEn,
        timeline,
        synopsisKo,
        synopsisEn,
        characters: [characterSlug],
        locations: [locationSlug],
        canonStatus: "canonical",
        themes: [keyword, genre].filter(Boolean),
      })
    )
    console.log(`  ✓ 에피소드 생성: ${ep01Slug}`)

    // chapter-01.md
    const chapterContent = buildChapter({
      characterName,
      characterSlug,
      locationSlug,
      novelTitle: worldTitle,
      titleKo,
      genre,
      worldview,
      keyword,
      year,
    })
    writeFileSync(join(storyDir, "chapter-01.md"), chapterContent)
    console.log(`  ✓ 챕터 생성: ${ep01Slug}/chapter-01.md`)

    // git commit
    execSync("git add -A", { cwd: root, stdio: "pipe" })
    execSync(`git commit -m "[setup] 소설: ${worldTitle} — ${genre} / ${keyword}"`, { cwd: root, stdio: "pipe" })
    console.log(`  ✓ git commit`)

    // canon lock
    try {
      execSync("canon lock --update-refs", { cwd: root, stdio: "pipe" })
      console.log(`  ✓ canon lock`)
    } catch {
      // fallback: try with node path
      try {
        const canonBin = new URL("../../cli.js", import.meta.url).pathname
        execSync(`node "${canonBin}" lock --update-refs`, { cwd: root, stdio: "pipe" })
        console.log(`  ✓ canon lock`)
      } catch {
        console.log(`  ⚠ canon lock 실패 — 나중에 수동으로 실행하세요: canon lock --update-refs`)
      }
    }

    // canon check
    console.log("")
    try {
      const result = execSync("canon check", { cwd: root, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] })
      console.log(result)
    } catch (e: unknown) {
      if (e && typeof e === "object" && "stdout" in e) {
        console.log((e as { stdout: string }).stdout)
      }
    }

    // Summary
    console.log("────────────────────────────────────────")
    console.log(`소설 제목:  ${worldTitle}`)
    console.log(`주인공:    ${characterName} (${characterSlug})`)
    console.log(`장르:      ${genre}`)
    console.log(`키워드:    ${keyword}`)
    console.log(`첫 화:     stories/${ep01Slug}/chapter-01.md`)
    console.log("")
    console.log("다음 단계:")
    console.log(`  1. stories/${ep01Slug}/chapter-01.md 를 열고 이야기를 이어가세요`)
    console.log(`  2. 새 에피소드:   canon new story ep02-<제목>`)
    console.log(`  3. 캐논 잠금:     canon lock --update-refs && canon check`)
    console.log(`  4. opencanon 발행: canon publish`)
    console.log("────────────────────────────────────────")
  })
