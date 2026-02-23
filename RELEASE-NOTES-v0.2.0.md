# Release Notes: @opencanon/canon v0.2.0

## Breaking Changes

### Schema Versions Bumped
- `StoryMetadata.schema_version`: `"1.1"` → `"1.2"`
- `CanonLock.schema_version`: `"canon.lock.v1"` → `"canon.lock.v2"`
- `RepoCheckReport.schemaVersion`: `"check.v1"` → `"check.v2"`

### New Required Field: contributor
- `StoryMetadata.contributor: string` — GitHub username, required, immutable after creation
- New check: `contributor_valid` (7th compliance check)

### New Field: CanonLock.contributors
- `contributors: string[]` — append-only list, auto-extracted from story metadata

### canon lock Pre-Check Gate
- `canon lock` now runs `canon check` before generating lock
- If any story fails compliance → lock refused (exit 1)

### RepoCheckReport Summary
- New `summary` field: `{ score, totalChecks, passingChecks }`

## Backward Compatibility

**v1.1 metadata is fully rejected.** No silent fallback.

Migration script provided: `node scripts/migrate-v1.2.mjs [repo-root]`

Reads `.canonrc.json` author, applies to all stories as contributor, bumps schema_version.

## Known Incompatibility

**z2a-instance-app-canon canon-seed** uses v1.1 metadata and canon.lock.v1.
Must be migrated separately before running the adapter against updated engine.

This is documented; canon-seed migration will be a separate commit in z2a-instance-app-canon.

## Metric ID Alignment (z2a-instance-app-canon)

Renamed in `registry/metrics.json` and `registry/topology.json`:
- `places_valid` → `locations_valid`
- `continuity_score` → `continuity_valid`

Added:
- `metadata_schema_valid`
- `contributor_valid`

These IDs now match `@opencanon/canon` CheckId exactly.
