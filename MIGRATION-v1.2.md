# Migration Guide: v0.1.x → v0.2.0

## Breaking Changes

### StoryMetadata schema_version: "1.1" → "1.2"
- `contributor` field is now **required** (string, non-empty)
- `schema_version` must be `"1.2"` — `"1.1"` is rejected by `checkMetadataSchema`
- `contributor` is immutable after creation — set once, never change

### RepoCheckReport: check.v1 → check.v2
- New `summary` field: `{ score, totalChecks, passingChecks }`
- `schemaVersion` is now `"check.v2"`
- `stories` array unchanged
- Consumers parsing `schemaVersion === "check.v1"` must update

### CanonLock: canon.lock.v1 → canon.lock.v2
- New `contributors` field: `string[]` (append-only, sorted)
- `schema_version` is now `"canon.lock.v2"`
- `canon lock` now runs `canon check` before generating — refuses lock if any story fails

### New check: contributor_valid
- 7th compliance check added
- Validates `contributor` field is present and non-empty string
- Added to `validateStory()` pipeline

## Migration Steps

1. Add `"contributor": "<github-username>"` to every `stories/*/metadata.json`
2. Change `"schema_version": "1.1"` → `"1.2"` in every `stories/*/metadata.json`
3. Run `canon check` — all 7 checks must pass
4. Run `canon lock` — generates canon.lock.v2 with contributors list
5. Update any CI/dashboard parsing `schemaVersion: "check.v1"` to `"check.v2"`
