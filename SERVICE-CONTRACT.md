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

Current enforcement (v0.2.0):
- `checkMetadataSchema()` (validate.ts:123): `schema_version !== "1.2"` produces a failing check result
- `checkCanonVersion()` (validate.ts:99): `canon_ref !== canonLock.canon_commit` produces a failing check result
- Adapters (fs.ts, github.ts): currently cast raw JSON to `StoryMetadata` without pre-validation

Planned (next implementation track):
- `parseMetadata()` / `parseCanonLock()`: adapter-level version gate — unsupported versions rejected before entering RepoModel
- `assertReportVersion()`: consumer-side defense — web rejects reports with unexpected schemaVersion
- Until implemented: unsupported versions are caught by `checkMetadataSchema` as a secondary defense

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
