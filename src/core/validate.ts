/**
 * Canon compliance validation logic.
 *
 * Pure functions — no I/O, no side effects.
 * Shared between CLI (local check) and adapter (engine observation).
 */
import type { StoryMetadata, CanonLock, CheckResult, StoryCheckReport, RepoCheckReport, CheckId, RepoModel } from "./types.js"

function check(id: CheckId, pass: boolean, message?: string): CheckResult {
  return { id, pass, ...(!pass && message ? { message } : {}) }
}

/**
 * Validate that all declared characters exist in the canon.
 */
export function checkCharacters(
  meta: StoryMetadata,
  knownCharacters: ReadonlySet<string>,
): CheckResult {
  const missing = meta.characters.filter(c => !knownCharacters.has(c))
  return check(
    "characters_valid",
    missing.length === 0,
    missing.length > 0 ? `Unknown characters: ${missing.join(", ")}` : undefined,
  )
}

/**
 * Validate that all declared locations exist in the canon.
 */
export function checkLocations(
  meta: StoryMetadata,
  knownLocations: ReadonlySet<string>,
): CheckResult {
  const missing = meta.locations.filter(l => !knownLocations.has(l))
  return check(
    "locations_valid",
    missing.length === 0,
    missing.length > 0 ? `Unknown locations: ${missing.join(", ")}` : undefined,
  )
}

/**
 * Validate that the timeline field is a valid ISO date.
 */
export function checkTimeline(meta: StoryMetadata): CheckResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.timeline)) {
    return check("timeline_consistent", false, `Invalid timeline date: "${meta.timeline}"`)
  }
  const [y, m, d] = meta.timeline.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const roundTrip = date.toISOString().slice(0, 10)
  const valid = roundTrip === meta.timeline
  return check(
    "timeline_consistent",
    valid,
    valid ? undefined : `Invalid timeline date: "${meta.timeline}"`,
  )
}

/**
 * Validate temporal_context references exist in known episode set.
 */
export function checkContinuity(
  meta: StoryMetadata,
  knownEpisodes: ReadonlySet<string>,
): CheckResult {
  if (!meta.temporal_context) {
    return check("continuity_valid", true)
  }

  const tc = meta.temporal_context
  const broken: string[] = []

  if (tc.prev_episode && !knownEpisodes.has(tc.prev_episode)) {
    broken.push(`prev_episode "${tc.prev_episode}" not found`)
  }
  if (tc.next_episode && !knownEpisodes.has(tc.next_episode)) {
    broken.push(`next_episode "${tc.next_episode}" not found`)
  }
  if (tc.thematic_echoes) {
    for (const echo of tc.thematic_echoes) {
      if (!knownEpisodes.has(echo)) {
        broken.push(`thematic_echo "${echo}" not found`)
      }
    }
  }

  return check(
    "continuity_valid",
    broken.length === 0,
    broken.length > 0 ? broken.join("; ") : undefined,
  )
}

/**
 * Validate that metadata.canon_ref matches canon.lock.json.
 */
export function checkCanonVersion(
  meta: StoryMetadata,
  canonLock: CanonLock | null,
): CheckResult {
  if (!canonLock) {
    return check("canon_version_match", false, "canon.lock.json not found")
  }
  const match = meta.canon_ref === canonLock.canon_commit
  return check(
    "canon_version_match",
    match,
    match ? undefined : `canon_ref "${meta.canon_ref}" does not match lock "${canonLock.canon_commit}"`,
  )
}

/**
 * Validate metadata.json schema conformance.
 */
export function checkMetadataSchema(meta: Record<string, unknown>): CheckResult {
  const required = ["schema_version", "canon_ref", "id", "episode", "title", "timeline", "synopsis", "characters", "locations", "contributor", "canon_status"]
  const missing = required.filter(f => !(f in meta))
  if (missing.length > 0) {
    return check("metadata_schema_valid", false, `Missing fields: ${missing.join(", ")}`)
  }
  if (meta.schema_version !== "1.2") {
    return check("metadata_schema_valid", false, `Expected schema_version "1.2", got "${meta.schema_version}"`)
  }
  if (typeof meta.episode !== "number") {
    return check("metadata_schema_valid", false, `episode must be a number`)
  }
  if (!Array.isArray(meta.characters)) {
    return check("metadata_schema_valid", false, `characters must be an array`)
  }
  if (!Array.isArray(meta.locations)) {
    return check("metadata_schema_valid", false, `locations must be an array`)
  }
  const validStatuses = ["canonical", "non-canonical"]
  if (!validStatuses.includes(meta.canon_status as string)) {
    return check("metadata_schema_valid", false, `canon_status must be "canonical" or "non-canonical"`)
  }
  return check("metadata_schema_valid", true)
}

/**
 * Validate that contributor field is present and non-empty.
 */
export function checkContributor(meta: StoryMetadata): CheckResult {
  const valid = typeof meta.contributor === "string" && meta.contributor.trim().length > 0
  return check(
    "contributor_valid",
    valid,
    valid ? undefined : "contributor must be a non-empty string",
  )
}

/**
 * Run all checks for a single story.
 */
export function validateStory(input: {
  meta: StoryMetadata
  rawMeta: Record<string, unknown>
  knownCharacters: ReadonlySet<string>
  knownLocations: ReadonlySet<string>
  knownEpisodes: ReadonlySet<string>
  canonLock: CanonLock | null
}): StoryCheckReport {
  const checks = [
    checkMetadataSchema(input.rawMeta),
    checkCharacters(input.meta, input.knownCharacters),
    checkLocations(input.meta, input.knownLocations),
    checkTimeline(input.meta),
    checkContinuity(input.meta, input.knownEpisodes),
    checkCanonVersion(input.meta, input.canonLock),
    checkContributor(input.meta),
  ]

  return {
    storyId: input.meta.id,
    checks,
    allPass: checks.every(c => c.pass),
  }
}

/**
 * Run all checks for an entire repo model.
 * Pure function — takes RepoModel, returns RepoCheckReport.
 */
export function validateRepo(model: RepoModel): RepoCheckReport {
  const stories: StoryCheckReport[] = []

  for (const [, { meta, raw }] of model.stories) {
    stories.push(validateStory({
      meta,
      rawMeta: raw,
      knownCharacters: model.characters,
      knownLocations: model.locations,
      knownEpisodes: model.episodes,
      canonLock: model.canonLock,
    }))
  }

  const totalStories = stories.length
  const passingStories = stories.filter(s => s.allPass).length
  const totalChecks = stories.reduce((sum, s) => sum + s.checks.length, 0)
  const passingChecks = stories.reduce((sum, s) => sum + s.checks.filter(c => c.pass).length, 0)

  return {
    schemaVersion: "check.v2",
    summary: {
      score: totalStories > 0 ? passingStories / totalStories : 0,
      totalChecks,
      passingChecks,
    },
    stories,
    totalStories,
    passingStories,
  }
}
