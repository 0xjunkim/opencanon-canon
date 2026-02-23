import type { StoryMetadata, CanonLock, CheckId } from "./types.js"

// ── Frozen constants (SERVICE-CONTRACT.md) ──
export const METADATA_VERSION = "1.2" as const
export const LOCK_VERSION = "canon.lock.v2" as const
export const REPORT_VERSION = "check.v2" as const

export const CHECK_IDS: readonly CheckId[] = [
  "metadata_schema_valid",
  "characters_valid",
  "locations_valid",
  "timeline_consistent",
  "continuity_valid",
  "canon_version_match",
  "contributor_valid",
] as const

// ── SchemaVersionError ──
export class SchemaVersionError extends Error {
  readonly expected: string
  readonly actual: unknown

  constructor(expected: string, actual: unknown) {
    super(`Expected schema version "${expected}", got ${JSON.stringify(actual)}`)
    this.name = "SchemaVersionError"
    this.expected = expected
    this.actual = actual
  }
}

// ── Parse functions (lightweight gate — version check only) ──

export function parseMetadata(raw: unknown): { meta: StoryMetadata; raw: Record<string, unknown> } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new SchemaVersionError(METADATA_VERSION, undefined)
  }
  const obj = raw as Record<string, unknown>
  if (obj.schema_version !== METADATA_VERSION) {
    throw new SchemaVersionError(METADATA_VERSION, obj.schema_version)
  }
  return { meta: obj as unknown as StoryMetadata, raw: obj }
}

export function parseCanonLock(raw: unknown): CanonLock {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new SchemaVersionError(LOCK_VERSION, undefined)
  }
  const obj = raw as Record<string, unknown>
  if (obj.schema_version !== LOCK_VERSION) {
    throw new SchemaVersionError(LOCK_VERSION, obj.schema_version)
  }
  return obj as unknown as CanonLock
}
