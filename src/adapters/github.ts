/**
 * GitHub adapter — pure conversion from parsed GitHub API data to RepoModel.
 * No I/O, no Octokit, no HTTP. Runs anywhere.
 */
import type { CanonLock, RepoModel, RepoModelAny, ParsedMetadataResult, GitHubRepoInput } from "../core/types.js"
import { parseCanonLock, parseMetadata, parseMetadataAny } from "../core/contract.js"

/**
 * Build a RepoModel from pre-fetched GitHub API data.
 *
 * Expects:
 * - tree: parsed Trees API response entries
 * - files: Map of path → file content string (for metadata.json, canon.lock.json, etc.)
 */
export function buildRepoModel(input: GitHubRepoInput): RepoModel {
  const { tree, files } = input

  // Parse canon.lock.json
  let canonLock: CanonLock | null = null
  const lockContent = files.get("canon.lock.json")
  if (lockContent) {
    canonLock = parseCanonLock(JSON.parse(lockContent))
  }

  // Extract character IDs from tree paths: canon/characters/<id>/ (dir) or canon/characters/<id>.json (blob)
  const characters = new Set<string>()
  for (const entry of tree) {
    if (entry.path.startsWith("canon/characters/")) {
      const parts = entry.path.split("/")
      if (parts.length === 3) {
        const name = entry.type === "tree" ? parts[2] : parts[2].replace(/\.json$/, "")
        if (name !== "index") {
          characters.add(name)
        }
      }
    }
  }

  // Extract location IDs from tree paths: canon/worldbuilding/locations/<id>.json or <id>/
  const locations = new Set<string>()
  for (const entry of tree) {
    if (entry.path.startsWith("canon/worldbuilding/locations/")) {
      const parts = entry.path.split("/")
      if (parts.length === 4) {
        const name = entry.type === "tree" ? parts[3] : parts[3].replace(/\.json$/, "")
        if (name !== "index") {
          locations.add(name)
        }
      }
    }
  }

  // Extract episode slugs from tree: stories/<slug>/
  const episodes = new Set<string>()
  for (const entry of tree) {
    if (entry.type === "tree" && entry.path.startsWith("stories/")) {
      const parts = entry.path.split("/")
      if (parts.length === 2) {
        episodes.add(parts[1])
      }
    }
  }

  // Parse story metadata from pre-fetched file contents
  const stories = new Map<string, ReturnType<typeof parseMetadata>>()
  for (const slug of episodes) {
    const metaContent = files.get(`stories/${slug}/metadata.json`)
    if (metaContent) {
      stories.set(slug, parseMetadata(JSON.parse(metaContent)))
    }
  }

  return { canonLock, characters, locations, episodes, stories }
}

// ── v1.3 additive (buildRepoModel above is frozen) ──

/**
 * Build a RepoModelAny from pre-fetched GitHub API data.
 * Supports both v1.2 and v1.3 metadata.
 */
export function buildRepoModelAny(input: GitHubRepoInput): RepoModelAny {
  const { tree, files } = input

  let canonLock: CanonLock | null = null
  const lockContent = files.get("canon.lock.json")
  if (lockContent) {
    canonLock = parseCanonLock(JSON.parse(lockContent))
  }

  const characters = new Set<string>()
  for (const entry of tree) {
    if (entry.path.startsWith("canon/characters/")) {
      const parts = entry.path.split("/")
      if (parts.length === 3) {
        const name = entry.type === "tree" ? parts[2] : parts[2].replace(/\.json$/, "")
        if (name !== "index") characters.add(name)
      }
    }
  }

  const locations = new Set<string>()
  for (const entry of tree) {
    if (entry.path.startsWith("canon/worldbuilding/locations/")) {
      const parts = entry.path.split("/")
      if (parts.length === 4) {
        const name = entry.type === "tree" ? parts[3] : parts[3].replace(/\.json$/, "")
        if (name !== "index") locations.add(name)
      }
    }
  }

  const episodes = new Set<string>()
  for (const entry of tree) {
    if (entry.type === "tree" && entry.path.startsWith("stories/")) {
      const parts = entry.path.split("/")
      if (parts.length === 2) episodes.add(parts[1])
    }
  }

  const stories = new Map<string, ParsedMetadataResult>()
  for (const slug of episodes) {
    const metaContent = files.get(`stories/${slug}/metadata.json`)
    if (metaContent) {
      stories.set(slug, parseMetadataAny(JSON.parse(metaContent)))
    }
  }

  return { canonLock, characters, locations, episodes, stories }
}
