# @opencanon/canon

Canon worldbuilding CLI and validation library for shared fiction universes.

## Overview

`@opencanon/canon` provides two things:

1. **CLI** (`canon`) — scaffold, validate, and manage canon worldbuilding repositories
2. **Library** — reusable validation logic for integrating canon compliance checks into other tools and platforms

## Installation

```bash
# Global (CLI usage)
npm install -g @opencanon/canon

# Local (library usage)
npm install @opencanon/canon
```

## CLI Commands

### `canon init [dir]`

Scaffold a new canon worldbuilding repository. Creates:

- `canon/characters/` — character definitions
- `canon/worldbuilding/locations/` — location definitions
- `stories/` — story directories
- `CONVENTIONS.md` — repo conventions reference
- `.canonrc.json` — project configuration

### `canon new <type> <id>`

Create a new entity from a template.

```bash
canon new story my-story        # stories/my-story/metadata.json
canon new character alice        # canon/characters/alice/definition.json
canon new location market-square # canon/worldbuilding/locations/market-square.json
```

IDs must be lowercase alphanumeric with hyphens/underscores only.

### `canon check [dir]`

Run compliance checks against a canon repository.

- Exit code **0** when all stories pass all checks
- Exit code **1** when any check fails or no stories are found

Seven checks performed per story:

| Check ID | Description |
|---|---|
| `metadata_schema_valid` | Required fields present, correct types, `schema_version === "1.2"` |
| `characters_valid` | Referenced characters exist in `canon/characters/` |
| `locations_valid` | Referenced locations exist in `canon/worldbuilding/locations/` |
| `timeline_consistent` | Timeline is a valid ISO date (YYYY-MM-DD, strict round-trip) |
| `continuity_valid` | Temporal context references point to existing episodes |
| `canon_version_match` | `canon_ref` matches `canon.lock.json` commit |
| `contributor_valid` | `contributor` field is present and non-empty |

### `canon lock [dir]`

Regenerate `canon.lock.json` from current `canon/` contents and git HEAD.

- Requires a git repository with at least one commit
- Runs compliance pre-check before generating — if any story fails, lock is refused (exit 1)
- Genesis lock (no existing `canon.lock.json`) skips pre-check
- Hash: SHA-256 over sorted file paths and contents (`path + NUL + bytes + NUL`)
- Deterministic: same input always produces the same hash

## Library Usage

### Core (pure validation)

```ts
import { validateRepo, type RepoModel, type RepoCheckReport } from "@opencanon/canon"

const report: RepoCheckReport = validateRepo(model)
// report.schemaVersion === "check.v2"
// report.summary — { score, totalChecks, passingChecks }
// report.stories — per-story check results
// report.totalStories / report.passingStories
```

### Filesystem adapter

```ts
import { loadRepoFromFs } from "@opencanon/canon/adapters/fs"

const model: RepoModel = loadRepoFromFs("/path/to/repo")
```

### GitHub adapter (pure conversion)

```ts
import { buildRepoModel } from "@opencanon/canon/adapters/github"
import type { GitHubRepoInput } from "@opencanon/canon"

// Provide pre-fetched GitHub API data (tree + file contents)
const model = buildRepoModel({ tree, files })
```

The GitHub adapter is a pure conversion function. It takes parsed GitHub API responses and returns a `RepoModel`. It does not perform any HTTP requests — your application handles fetching.

## Repository Structure

```
your-canon-repo/
  canon/
    characters/
      <id>/definition.json
    worldbuilding/
      locations/
        <id>.json
  stories/
    <slug>/
      metadata.json
      chapter-01.md
  canon.lock.json
  CONVENTIONS.md
  .canonrc.json
```

## Metadata Schema (v1.2)

Each story requires a `metadata.json`:

```json
{
  "schema_version": "1.2",
  "canon_ref": "<commit-sha>",
  "id": "my-story",
  "episode": 1,
  "title": { "ko": "...", "en": "..." },
  "timeline": "2025-01-15",
  "synopsis": { "ko": "...", "en": "..." },
  "characters": ["alice", "bob"],
  "locations": ["market-square"],
  "contributor": "github-username",
  "canon_status": "canonical"
}
```

## Lock File (canon.lock.v2)

```json
{
  "schema_version": "canon.lock.v2",
  "canon_commit": "<git-HEAD-sha>",
  "worldbuilding_hash": "<sha256-hex>",
  "hash_algo": "sha256",
  "generated_at": "2025-01-15T00:00:00.000Z",
  "contributors": ["github-username"]
}
```

## Migration from v1.1

See [MIGRATION-v1.2.md](../../MIGRATION-v1.2.md).

## License

MIT
