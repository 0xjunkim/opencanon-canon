import type { StoryMetadata, StoryMetadata_v1_3, CanonLock, CheckId, CheckIdV3, ParsedMetadataResult } from "./types.js"

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

export function assertReportVersion(report: unknown): void {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new SchemaVersionError(REPORT_VERSION, undefined)
  }
  const obj = report as Record<string, unknown>
  if (obj.schemaVersion !== REPORT_VERSION) {
    throw new SchemaVersionError(REPORT_VERSION, obj.schemaVersion)
  }
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

// ── v1.3 additive constants (frozen v1.2 above untouched) ──

export const METADATA_VERSION_V13 = "1.3" as const
export const REPORT_VERSION_V3 = "check.v3" as const

export const CHECK_IDS_V13: readonly CheckIdV3[] = [
  "metadata_schema_valid",
  "characters_valid",
  "locations_valid",
  "timeline_consistent",
  "continuity_valid",
  "canon_version_match",
  "contributor_valid",
  "derived_from_valid",
] as const

// ── v1.3 parse functions ──

export function parseMetadata_v1_3(raw: unknown): { meta: StoryMetadata_v1_3; raw: Record<string, unknown> } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new SchemaVersionError(METADATA_VERSION_V13, undefined)
  }
  const obj = raw as Record<string, unknown>
  if (obj.schema_version !== METADATA_VERSION_V13) {
    throw new SchemaVersionError(METADATA_VERSION_V13, obj.schema_version)
  }
  return { meta: obj as unknown as StoryMetadata_v1_3, raw: obj }
}

export function parseMetadataAny(raw: unknown): ParsedMetadataResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new SchemaVersionError(`${METADATA_VERSION} or ${METADATA_VERSION_V13}`, undefined)
  }
  const obj = raw as Record<string, unknown>
  if (obj.schema_version === METADATA_VERSION) {
    return { version: "1.2", meta: obj as unknown as StoryMetadata, raw: obj }
  }
  if (obj.schema_version === METADATA_VERSION_V13) {
    return { version: "1.3", meta: obj as unknown as StoryMetadata_v1_3, raw: obj }
  }
  throw new SchemaVersionError(
    `${METADATA_VERSION} or ${METADATA_VERSION_V13}`,
    obj.schema_version,
  )
}

export function assertReportVersion_v3(report: unknown): void {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new SchemaVersionError(REPORT_VERSION_V3, undefined)
  }
  const obj = report as Record<string, unknown>
  if (obj.schemaVersion !== REPORT_VERSION_V3) {
    throw new SchemaVersionError(REPORT_VERSION_V3, obj.schemaVersion)
  }
}
