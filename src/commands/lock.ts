import { Command } from "commander"
import { resolve, join, relative, sep } from "node:path"
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs"
import { createHash } from "node:crypto"
import { execSync } from "node:child_process"
import type { CanonLock } from "../core/types.js"
import { loadRepoFromFs } from "../adapters/fs.js"
import { parseCanonLock } from "../core/contract.js"
import { validateRepo } from "../core/validate.js"

function updateStoryRefs(repoRoot: string, newRef: string): number {
  const storiesDir = join(repoRoot, "stories")
  if (!existsSync(storiesDir)) return 0
  const entries = readdirSync(storiesDir, { withFileTypes: true })
  let count = 0
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const metaPath = join(storiesDir, entry.name, "metadata.json")
    if (!existsSync(metaPath)) continue
    try {
      const meta = JSON.parse(readFileSync(metaPath, "utf-8"))
      meta.canon_ref = newRef
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n")
      count++
    } catch { /* skip malformed */ }
  }
  return count
}

function collectFiles(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results

  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectFiles(full))
    } else {
      results.push(full)
    }
  }
  return results
}

export const lockCommand = new Command("lock")
  .description("Regenerate canon.lock.json from current canon/ contents")
  .argument("[dir]", "repo root directory", ".")
  .option("--update-refs", "update canon_ref in all story metadata.json to the new commit")
  .action((dir: string, opts: { updateRefs?: boolean }) => {
    const repoRoot = resolve(dir)
    const canonDir = join(repoRoot, "canon")

    if (!existsSync(canonDir)) {
      console.error("Error: canon/ directory not found")
      process.exit(1)
    }

    // Pre-check: all stories must pass compliance before lock is allowed.
    // Skip if no canon.lock.json exists yet (genesis lock — nothing to check against).
    let model
    try {
      model = loadRepoFromFs(repoRoot)
    } catch (err) {
      console.error(`Error: failed to read repo: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
    const isGenesis = model.canonLock === null
    if (!isGenesis) {
      const report = validateRepo(model)
      if (report.totalStories > 0 && report.passingStories < report.totalStories) {
        const failing = report.stories.filter(s => !s.allPass)
        // When --update-refs is set, canon_version_match failures are expected and will be fixed.
        // Filter them out of the blocking check.
        const blockingFails = opts.updateRefs
          ? failing.filter(s => s.checks.some(c => !c.pass && c.id !== "canon_version_match"))
          : failing
        if (blockingFails.length > 0) {
          console.error("Error: compliance check failed — lock refused")
          for (const s of blockingFails) {
            const fails = s.checks.filter(c => !c.pass && (opts.updateRefs ? c.id !== "canon_version_match" : true)).map(c => c.id).join(", ")
            console.error(`  ${s.storyId}: ${fails}`)
          }
          process.exit(1)
        }
      }
    }

    // git rev-parse HEAD — hard error on failure
    let canonCommit: string
    try {
      canonCommit = execSync("git rev-parse HEAD", {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim()
    } catch {
      console.error("Error: git rev-parse HEAD failed. canon.lock.json requires a commit ref.")
      process.exit(1)
    }

    // Collect all files under canon/, normalize to forward-slash relative paths, sort
    const absolutePaths = collectFiles(canonDir)
    const relativePaths = absolutePaths
      .map(p => relative(canonDir, p).split(sep).join("/"))
      .sort()

    // Hash: for each file in sorted order, feed relativePath + NUL + fileBytes + NUL
    const hash = createHash("sha256")
    for (const relPath of relativePaths) {
      const absPath = join(canonDir, ...relPath.split("/"))
      const bytes = readFileSync(absPath)
      hash.update(relPath)
      hash.update("\0")
      hash.update(bytes)
      hash.update("\0")
    }
    const worldbuildingHash = hash.digest("hex")

    // Extract unique contributors from story metadata (append-only)
    const contributors = new Set<string>()
    // Preserve existing contributors from previous lock
    const existingLockPath = join(repoRoot, "canon.lock.json")
    if (existsSync(existingLockPath)) {
      try {
        const prev = parseCanonLock(JSON.parse(readFileSync(existingLockPath, "utf-8")))
        if (Array.isArray(prev.contributors)) {
          for (const c of prev.contributors) contributors.add(c)
        }
      } catch { /* ignore malformed lock */ }
    }
    // Add contributors from current stories
    for (const [, { meta }] of model.stories) {
      if (meta.contributor) contributors.add(meta.contributor)
    }

    const lock: CanonLock = {
      schema_version: "canon.lock.v2",
      canon_commit: canonCommit,
      worldbuilding_hash: worldbuildingHash,
      hash_algo: "sha256",
      generated_at: new Date().toISOString(),
      contributors: [...contributors].sort(),
    }

    const lockPath = join(repoRoot, "canon.lock.json")
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n")
    console.log(`canon.lock.json updated`)
    console.log(`  commit: ${canonCommit}`)
    console.log(`  hash:   ${worldbuildingHash}`)

    if (opts.updateRefs) {
      const updated = updateStoryRefs(repoRoot, canonCommit)
      if (updated > 0) {
        console.log(`  refs:   updated ${updated} story metadata.json`)
      }
    }
  })
