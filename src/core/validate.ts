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

function isBilingualObject(v: unknown): v is { ko: string; en: string } {
  return (
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    typeof (v as Record<string, unknown>).ko === "string" &&
    typeof (v as Record<string, unknown>).en === "string"
  )
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
    if (!Array.isArray(tc.thematic_echoes)) {
      broken.push("thematic_echoes must be an array")
    } else {
      for (const echo of tc.thematic_echoes) {
        if (!knownEpisodes.has(echo)) {
          broken.push(`thematic_echo "${echo}" not found`)
        }
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
export function checkMetadataSchema(meta: Record<string, unknown>, slug?: string): CheckResult {
  const required = ["schema_version", "canon_ref", "id", "episode", "title", "timeline", "synopsis", "characters", "locations", "contributor", "canon_status"]
  const missing = required.filter(f => !(f in meta))
  if (missing.length > 0) {
    return check("metadata_schema_valid", false, `Missing fields: ${missing.join(", ")}`)
  }
  if (meta.schema_version !== "1.2") {
    return check("metadata_schema_valid", false, `Expected schema_version "1.2", got "${meta.schema_version}"`)
  }
  if (typeof meta.episode !== "number" || !Number.isFinite(meta.episode)) {
    return check("metadata_schema_valid", false, `episode must be a finite number`)
  }
  if (!Array.isArray(meta.characters)) {
    return check("metadata_schema_valid", false, `characters must be an array`)
  }
  if (!Array.isArray(meta.locations)) {
    return check("metadata_schema_valid", false, `locations must be an array`)
  }
  for (const field of ["canon_ref", "id", "contributor", "timeline"] as const) {
    if (typeof meta[field] !== "string") {
      return check("metadata_schema_valid", false, `${field} must be a string`)
    }
  }
  if (!isBilingualObject(meta.title)) {
    return check("metadata_schema_valid", false, `title must be { ko: string, en: string }`)
  }
  if (!isBilingualObject(meta.synopsis)) {
    return check("metadata_schema_valid", false, `synopsis must be { ko: string, en: string }`)
  }
  if (!(meta.characters as unknown[]).every((c: unknown) => typeof c === "string")) {
    return check("metadata_schema_valid", false, `characters array must contain only strings`)
  }
  if (!(meta.locations as unknown[]).every((l: unknown) => typeof l === "string")) {
    return check("metadata_schema_valid", false, `locations array must contain only strings`)
  }
  if (slug !== undefined && typeof meta.id === "string" && meta.id !== slug) {
    return check("metadata_schema_valid", false,
      `metadata.id "${meta.id}" must match directory slug "${slug}"`)
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
/** GitHub/git-style username: alphanumeric + hyphens/underscores, 1–39 chars, no leading/trailing hyphen */
const CONTRIBUTOR_RE = /^[a-zA-Z0-9_][a-zA-Z0-9_-]{0,37}[a-zA-Z0-9_]$|^[a-zA-Z0-9_]$/

export function checkContributor(meta: StoryMetadata): CheckResult {
  const value = meta.contributor
  if (typeof value !== "string" || value.trim().length === 0) {
    return check("contributor_valid", false, "contributor must be a non-empty string")
  }
  const valid = CONTRIBUTOR_RE.test(value.trim())
  return check(
    "contributor_valid",
    valid,
    valid ? undefined : `contributor "${value}" is not a valid username (alphanumeric/hyphens/underscores, 1–39 chars)`,
  )
}

/**
 * Run all checks for a single story.
 */
export function validateStory(input: {
  meta: StoryMetadata
  rawMeta: Record<string, unknown>
  slug?: string
  knownCharacters: ReadonlySet<string>
  knownLocations: ReadonlySet<string>
  knownEpisodes: ReadonlySet<string>
  canonLock: CanonLock | null
}): StoryCheckReport {
  const schemaCheck = checkMetadataSchema(input.rawMeta, input.slug)

  const checks: CheckResult[] = schemaCheck.pass
    ? [
        schemaCheck,
        checkCharacters(input.meta, input.knownCharacters),
        checkLocations(input.meta, input.knownLocations),
        checkTimeline(input.meta),
        checkContinuity(input.meta, input.knownEpisodes),
        checkCanonVersion(input.meta, input.canonLock),
        checkContributor(input.meta),
      ]
    : [
        schemaCheck,
        check("characters_valid", false, "skipped: metadata schema invalid"),
        check("locations_valid", false, "skipped: metadata schema invalid"),
        check("timeline_consistent", false, "skipped: metadata schema invalid"),
        check("continuity_valid", false, "skipped: metadata schema invalid"),
        check("canon_version_match", false, "skipped: metadata schema invalid"),
        check("contributor_valid", false, "skipped: metadata schema invalid"),
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

  for (const [slug, { meta, raw }] of model.stories) {
    stories.push(validateStory({
      meta,
      rawMeta: raw,
      slug,
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
