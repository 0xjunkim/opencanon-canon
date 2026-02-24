# Service Contract: @opencanon/canon v0.2.0

Effective from: v0.2.0 tag (commit bbef928)
Status: FROZEN — changes require major version bump.

## Frozen Schema Versions

| Schema | Version | File |
|---|---|---|
| StoryMetadata | `"1.2"` | `stories/*/metadata.json` |
| CanonLock | `"canon.lock.v2"` | `canon.lock.json` |
| RepoCheckReport | `"check.v2"` | `validateRepo()` output |

## Frozen Check IDs (7, ordered)

1. `metadata_schema_valid`
2. `characters_valid`
3. `locations_valid`
4. `timeline_consistent`
5. `continuity_valid`
6. `canon_version_match`
7. `contributor_valid`

Check IDs are additive-only. Removal or rename is a breaking change.

## Fail-Closed Rule

Implemented (v0.2.1):
- `parseMetadata()` / `parseCanonLock()` (contract.ts): adapter-level version gate — unsupported versions throw `SchemaVersionError` before entering RepoModel
- Adapters (fs.ts, github.ts): all metadata/lock parsing routes through `parseMetadata()` / `parseCanonLock()`
- `checkMetadataSchema()` (validate.ts): validates field presence, types, and `schema_version === "1.2"`
- `checkCanonVersion()` (validate.ts): `canon_ref !== canonLock.canon_commit` produces a failing check result
- `validateStory()` short-circuit: if `checkMetadataSchema` fails, remaining 6 checks auto-fail

Planned:
- `assertReportVersion()`: consumer-side defense — web rejects reports with unexpected schemaVersion

Principle: no silent fallback, no best-effort parsing. Unknown version = rejected.

## Consumer Contract

- `validateRepo()` always returns `schemaVersion: "check.v2"`
- Every story in the report produces exactly 7 checks in the order listed above
- `summary.totalChecks` = number of stories x 7
- `summary.score` = `passingStories / totalStories` (0.0 to 1.0, source: validate.ts:208)
- `summary.passingChecks` = total passing checks across all stories

## Engine v2 Boundary

Engine v2 may introduce new schema versions. When that happens:
- These frozen versions remain unchanged in this package
- New versions get new type definitions and new parse functions (additive)
- Consumers opt in to new versions explicitly
- Per-episode canon_ref chains: v0.3.0+ candidate, not in v0.2.x scope
- Contract tests (`src/test/contract.test.ts`) must continue passing after any change
