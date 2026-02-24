# ADR-002: Canonical Identifier — Directory Slug as Primary Key

Status: Proposed
Date: 2025-02-24

## Context

@opencanon/canon currently has two identifiers for each story:

1. **Directory slug** — the filesystem directory name under `stories/` (e.g., `stories/ep01/`)
2. **`metadata.id`** — a string field inside `metadata.json`

Nothing enforces these two values to match. `RepoModel` uses the directory slug as the
Map key, while `StoryCheckReport` uses `metadata.id` as `storyId`. This creates ambiguity
about which is the canonical identifier.

### Risks of dual identifiers

- `temporal_context.prev_episode` references use metadata IDs, but episode detection uses
  directory slugs. A mismatch breaks cross-referencing.
- Duplicate `metadata.id` values across different directory slugs are not detected, because
  the filesystem guarantees slug uniqueness but not `metadata.id` uniqueness.
- Consumers cannot reliably map between report output (`storyId`) and filesystem paths.

## Decision

### Phase 1 — v0.2.3 (advisory)

- `canon check` emits a `console.warn` when `directory slug !== metadata.id`.
- No new check ID. The 7 frozen CHECK_IDS remain unchanged.
- Exit code is unaffected — the warning is informational only.
- Purpose: give existing users time to align their data before enforcement.

### Phase 2 — v0.3.0 (enforcement)

- `slug === metadata.id` becomes a hard requirement.
- Violation fails the `metadata_schema_valid` check (no new check ID needed).
- With slug uniqueness guaranteed by the filesystem and `id === slug` enforced,
  duplicate metadata IDs are eliminated automatically.

### Canonical identifier declaration

The **directory slug** is the canonical identifier. `metadata.id` must match it exactly.
This aligns with how `RepoModel.episodes` (Set of slugs), `RepoModel.stories` (Map keyed
by slug), and the `canon new` command (which generates both slug and id from the same input)
already work.

## Consequences

- v0.2.3 users see warnings and can fix mismatches proactively.
- v0.3.0 breaking change is announced with sufficient lead time.
- No separate "duplicate ID" check is needed — slug filesystem uniqueness handles it.
- `StoryCheckReport.storyId` will continue to use `metadata.id`, which after enforcement
  equals the slug.
