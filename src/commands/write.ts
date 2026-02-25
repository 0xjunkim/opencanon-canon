import { Command } from "commander"
import { resolve, join } from "node:path"
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { createHash } from "node:crypto"
import { metadataTemplate } from "../templates/metadata.js"
import { loadConfig } from "./login.js"

const OPENCANON_HOST = "https://opencanon.co"

// ─── Lossy SHA-256 hash (12 hex chars = 48 bits) ─────────────────────────────
function sha12(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex").slice(0, 12)
}

interface RefEntry {
  hash: string
  source: "self" | "notebook" | "cross"
  storyId?: string
  owner?: string
  repo?: string
  preview: string // first 60 chars only (bounded)
  createdAt: string
}

interface CanonRefs {
  episode: string
  createdAt: string
  refs: RefEntry[]
}

// ─── Read own recent chapter ──────────────────────────────────────────────────
function readOwnContext(root: string): { content: string; storyId: string } | null {
  const storiesDir = join(root, "stories")
  if (!existsSync(storiesDir)) return null

  const storyDirs = readdirSync(storiesDir).filter((d) => {
    try {
      return statSync(join(storiesDir, d)).isDirectory()
    } catch { return false }
  }).sort().reverse() // most recent episode first (alphabetical reverse)

  for (const storyDir of storyDirs) {
    const candidates = [
      join(storiesDir, storyDir, "ko", "chapter-01.md"),
      join(storiesDir, storyDir, "en", "chapter-01.md"),
      join(storiesDir, storyDir, "content.md"),
      join(storiesDir, storyDir, "chapter-01.md"),
    ]
    for (const p of candidates) {
      if (existsSync(p)) {
        const content = readFileSync(p, "utf-8").slice(0, 800) // bounded
        return { content, storyId: storyDir }
      }
    }
  }
  return null
}

// ─── Fetch notebook from opencanon API ───────────────────────────────────────
async function fetchNotebook(host: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`${host}/api/notebook`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = await res.json() as { content?: string }
    return data.content?.slice(0, 600) ?? null // bounded
  } catch { return null }
}

// ─── Fetch cross-refs from public opencanon registry ─────────────────────────
async function fetchCrossRefs(
  host: string,
  skipOwner: string
): Promise<Array<{ owner: string; repo: string; content: string }>> {
  try {
    const res = await fetch(`${host}/api/registry`)
    if (!res.ok) return []
    const repos = await res.json() as Array<{ owner: string; repo: string; title?: Record<string, string> }>
    const results: Array<{ owner: string; repo: string; content: string }> = []

    for (const r of repos.slice(0, 3)) { // max 3 cross-refs (bounded)
      if (r.owner.toLowerCase() === skipOwner.toLowerCase()) continue
      const titleText = Object.values(r.title ?? {}).join(" / ")
      const snippet = `${r.owner}/${r.repo} — ${titleText}`.slice(0, 200)
      results.push({ owner: r.owner, repo: r.repo, content: snippet })
    }
    return results
  } catch { return [] }
}

// ─── Fire-and-forget attestation for cross-referenced repos ──────────────────
async function attestCrossRefs(
  host: string,
  token: string,
  owner: string,
  crossRefs: Array<{ owner: string; repo: string }>
): Promise<void> {
  for (const ref of crossRefs) {
    try {
      await fetch(`${host}/api/attest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Canon-Owner": owner,
        },
        body: JSON.stringify({ target: `${ref.owner}/${ref.repo}` }),
      })
    } catch { /* silent — attest is best-effort */ }
  }
}

// ─── Detect current repo owner from .canonrc ─────────────────────────────────
function detectOwner(root: string): string {
  const rcPath = join(root, ".canonrc.json")
  if (existsSync(rcPath)) {
    try {
      const rc = JSON.parse(readFileSync(rcPath, "utf-8"))
      return rc.author || "unknown"
    } catch { /* ignore */ }
  }
  return "unknown"
}

// ─── Build chapter scaffold ───────────────────────────────────────────────────
function buildScaffold(episodeSlug: string, refs: RefEntry[]): string {
  const refBlock = refs
    .map((r) => `<!--ref:#${r.hash} source:${r.source}${r.storyId ? ` story:${r.storyId}` : ""}-->`)
    .join("\n")

  return `${refBlock}

# ${episodeSlug.replace(/^ep\d+-/, "").replace(/-/g, " ")}

---

*[이야기를 이어가세요]*

`
}

// ─── Main command ─────────────────────────────────────────────────────────────

export const writeCommand = new Command("write")
  .description("Scaffold next chapter with lossy cross-referenced context")
  .argument("<episode-slug>", "Episode slug (e.g. ep02-title)")
  .option("--no-refs", "Skip cross-referencing other novels")
  .option("--no-notebook", "Skip notebook context")
  .option("--host <url>", "opencanon host", OPENCANON_HOST)
  .action(async (episodeSlug: string, opts: { refs: boolean; notebook: boolean; host: string }) => {
    const root = resolve(".")
    const host = opts.host ?? OPENCANON_HOST
    const config = loadConfig()
    const owner = detectOwner(root)

    console.log("")
    console.log(`[canon write] ${episodeSlug}`)
    console.log("컨텍스트를 수집하고 있습니다...\n")

    const refs: RefEntry[] = []
    const now = new Date().toISOString()

    // ── 1. Own recent chapter ──────────────────────────────────────────────
    const own = readOwnContext(root)
    if (own) {
      refs.push({
        hash: sha12(own.content),
        source: "self",
        storyId: own.storyId,
        preview: own.content.slice(0, 60),
        createdAt: now,
      })
      console.log(`  ✓ 자체 참조: ${own.storyId} (#${sha12(own.content)})`)
    }

    // ── 2. Notebook ────────────────────────────────────────────────────────
    if (opts.notebook !== false && config?.token) {
      const notebook = await fetchNotebook(host, config.token)
      if (notebook && notebook.trim()) {
        refs.push({
          hash: sha12(notebook),
          source: "notebook",
          preview: notebook.slice(0, 60),
          createdAt: now,
        })
        console.log(`  ✓ 수첩 참조: (#${sha12(notebook)})`)
      } else {
        console.log(`  ○ 수첩: 비어있거나 토큰 없음`)
      }
    }

    // ── 3. Cross-refs ──────────────────────────────────────────────────────
    if (opts.refs !== false) {
      const crossRefs = await fetchCrossRefs(host, owner)
      for (const cr of crossRefs) {
        refs.push({
          hash: sha12(cr.content),
          source: "cross",
          owner: cr.owner,
          repo: cr.repo,
          preview: cr.content.slice(0, 60),
          createdAt: now,
        })
        console.log(`  ✓ 교차 참조: ${cr.owner}/${cr.repo} (#${sha12(cr.content)})`)
      }

      // Attest each cross-referenced novel (best-effort, fire-and-forget)
      if (crossRefs.length > 0 && config?.token) {
        attestCrossRefs(host, config.token, owner, crossRefs).catch(() => {})
      }
    }

    // ── 4. Save .canon-refs.json ───────────────────────────────────────────
    const refsRecord: CanonRefs = { episode: episodeSlug, createdAt: now, refs }
    const refsPath = join(root, ".canon-refs.json")
    let existing: CanonRefs[] = []
    if (existsSync(refsPath)) {
      try { existing = JSON.parse(readFileSync(refsPath, "utf-8")) } catch { /* ignore */ }
    }
    writeFileSync(refsPath, JSON.stringify([...existing, refsRecord], null, 2) + "\n")

    // ── 5. Scaffold episode ────────────────────────────────────────────────
    const storyDir = join(root, "stories", episodeSlug)
    if (!existsSync(storyDir)) {
      mkdirSync(storyDir, { recursive: true })
    }

    const chapterPath = join(storyDir, "chapter-01.md")
    if (!existsSync(chapterPath)) {
      writeFileSync(chapterPath, buildScaffold(episodeSlug, refs))
      console.log(`\n  ✓ 챕터 생성: stories/${episodeSlug}/chapter-01.md`)
    } else {
      console.log(`\n  ○ 챕터 이미 존재: stories/${episodeSlug}/chapter-01.md`)
    }

    const metaPath = join(storyDir, "metadata.json")
    if (!existsSync(metaPath)) {
      writeFileSync(
        metaPath,
        metadataTemplate(episodeSlug, {
          contributor: owner,
          episode: parseInt(episodeSlug.match(/ep(\d+)/)?.[1] ?? "1", 10),
          titleKo: episodeSlug.replace(/^ep\d+-/, "").replace(/-/g, " "),
          titleEn: episodeSlug.replace(/^ep\d+-/, "").replace(/-/g, " "),
          timeline: new Date().toISOString().slice(0, 10),
          synopsisKo: "",
          synopsisEn: "",
          characters: [],
          locations: [],
          canonStatus: "canonical",
          themes: [],
        })
      )
      console.log(`  ✓ 메타데이터: stories/${episodeSlug}/metadata.json`)
    }

    // ── Summary ────────────────────────────────────────────────────────────
    console.log("")
    console.log("────────────────────────────────────────")
    console.log(`에피소드:   ${episodeSlug}`)
    console.log(`참조 수:    ${refs.length}개 (비가역 hash)`)
    console.log(`참조 기록:  .canon-refs.json`)
    console.log("")
    console.log("다음 단계:")
    console.log(`  1. stories/${episodeSlug}/chapter-01.md 열고 이야기를 이어가세요`)
    console.log(`  2. stories/${episodeSlug}/metadata.json 제목/시놉시스 채우기`)
    console.log(`  3. canon lock --update-refs && canon check`)
    console.log("────────────────────────────────────────")
  })
