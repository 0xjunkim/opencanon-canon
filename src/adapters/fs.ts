/**
 * Filesystem adapter — reads a local canon repo into a RepoModel.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import type { CanonLock, RepoModel, RepoModelAny, ParsedMetadataResult } from "../core/types.js"
import { parseCanonLock, parseMetadata, parseMetadataAny } from "../core/contract.js"

function listSubDirs(dirPath: string): string[] {
  if (!existsSync(dirPath)) return []
  return readdirSync(dirPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
}

function listCanonEntries(dirPath: string): string[] {
  if (!existsSync(dirPath)) return []
  return readdirSync(dirPath, { withFileTypes: true })
    .map(d => d.isDirectory() ? d.name : d.name.replace(/\.json$/, ""))
    .filter(name => name !== "index")
}

function readCanonLock(repoRoot: string): CanonLock | null {
  const lockPath = join(repoRoot, "canon.lock.json")
  if (!existsSync(lockPath)) return null
  return parseCanonLock(JSON.parse(readFileSync(lockPath, "utf-8")))
}

function readStoryMetadata(storyDir: string): ReturnType<typeof parseMetadata> | null {
  const metaPath = join(storyDir, "metadata.json")
  if (!existsSync(metaPath)) return null
  return parseMetadata(JSON.parse(readFileSync(metaPath, "utf-8")))
}

/**
 * Load a local canon repo into an I/O-free RepoModel.
 */
export function loadRepoFromFs(repoRoot: string): RepoModel {
  const canonLock = readCanonLock(repoRoot)
  const characters = new Set(listCanonEntries(join(repoRoot, "canon", "characters")))
  const locations = new Set(listCanonEntries(join(repoRoot, "canon", "worldbuilding", "locations")))

  const storiesDir = join(repoRoot, "stories")
  const storyDirs = listSubDirs(storiesDir)
  const episodes = new Set(storyDirs)

  const stories = new Map<string, ReturnType<typeof parseMetadata>>()
  for (const slug of storyDirs) {
    const result = readStoryMetadata(join(storiesDir, slug))
    if (result) {
      stories.set(slug, result)
    }
  }

  return { canonLock, characters, locations, episodes, stories }
}

// ── v1.3 additive (loadRepoFromFs above is frozen) ──

function readStoryMetadataAny(storyDir: string): ParsedMetadataResult | null {
  const metaPath = join(storyDir, "metadata.json")
  if (!existsSync(metaPath)) return null
  return parseMetadataAny(JSON.parse(readFileSync(metaPath, "utf-8")))
}

/**
 * Load a local canon repo supporting both v1.2 and v1.3 metadata.
 */
export function loadRepoFromFsAny(repoRoot: string): RepoModelAny {
  const canonLock = readCanonLock(repoRoot)
  const characters = new Set(listCanonEntries(join(repoRoot, "canon", "characters")))
  const locations = new Set(listCanonEntries(join(repoRoot, "canon", "worldbuilding", "locations")))

  const storiesDir = join(repoRoot, "stories")
  const storyDirs = listSubDirs(storiesDir)
  const episodes = new Set(storyDirs)

  const stories = new Map<string, ParsedMetadataResult>()
  for (const slug of storyDirs) {
    const result = readStoryMetadataAny(join(storiesDir, slug))
    if (result) {
      stories.set(slug, result)
    }
  }

  return { canonLock, characters, locations, episodes, stories }
}
