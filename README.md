# @opencanon/canon

**The fiction canon protocol.** A novel whose structure lives in GitHub, verified for consistency, cross-referenced across stories.

> "The story we write writes us."
> — opencanon.co

---

## What this is

opencanon is a structured co-authorship protocol for fiction. Your novel's characters, locations, timeline, and episodes are stored in a GitHub repository with a defined schema. The CLI validates structural integrity, generates cross-referenced writing scaffolds, and publishes episodes to [opencanon.co](https://opencanon.co) — a registry where novels can reference each other.

**The AI writes. opencanon remembers.**

---

## Install

```bash
npm install -g @opencanon/canon
```

Verify:

```bash
canon --version   # 0.4.0
```

---

## Start your novel in 5 minutes

### Step 1 — Create the novel on opencanon.co

Go to [opencanon.co](https://opencanon.co), sign in with GitHub, and complete the setup wizard (novel title → protagonist → genre → one-line synopsis). This creates a GitHub repo and registers it on the platform.

Or, if you prefer the CLI first:

```bash
mkdir my-novel && cd my-novel
git init
canon init
# Scaffolds directory structure and config files (non-interactive)
# For an interactive guided setup:
canon setup
git add -A && git commit -m "canon: setup" && git push
```

Then register at [opencanon.co](https://opencanon.co) → sign in → your repo will appear in **내 소설 / My Canon**.

### Step 2 — Authenticate the CLI

```bash
canon login
# Prompts: opencanon.co host + CLI token
# Get your token: opencanon.co/settings → CLI Token → Generate
```

### Step 3 — Write the next episode

```bash
canon write ep02-the-road
```

This generates a writing scaffold with three context sources (bounded, irreversible):
- Your own latest episode (≤800 chars)
- Your personal notebook from opencanon.co/notebook (≤600 chars)
- Snippets from 3 other registered novels (≤200 chars each, cross-reference attested)

Output: a Markdown scaffold with `<!--ref:#hash-->` markers. **Paste the generated context prompt into any AI** (Claude, ChatGPT, etc.) to write the episode.

### Step 4 — Submit the episode

After writing, submit via web at `opencanon.co/write/{username}/{repo}` — or commit directly to your GitHub repo following the structure below.

### Step 5 — Publish

```bash
canon publish ep02-the-road
# Marks episode live on opencanon.co → visible in story page
```

---

## Repository structure

```
{your-repo}/
├── canon/
│   ├── characters/
│   │   └── {character-id}/
│   │       └── definition.json
│   └── worldbuilding/
│       └── locations/
│           └── {location-id}.json
├── stories/
│   └── {episode-id}/
│       ├── metadata.json          ← Required. Defines episode structure.
│       ├── ko/                    ← Korean locale chapters
│       │   └── chapter-01.md
│       └── en/                    ← English locale chapters
│           └── chapter-01.md
├── canon.lock.json                ← Integrity lock (auto-generated)
├── .canonrc.json                  ← CLI config (author, default_lang)
├── CONVENTIONS.md                 ← Your novel's writing rules
└── GETTING-STARTED.md
```

---

## metadata.json (schema v1.2)

Every episode requires `metadata.json` in `stories/{id}/`:

```json
{
  "schema_version": "1.2",
  "canon_ref": "<commit-hash from canon.lock.json>",
  "id": "ep02-the-road",
  "episode": 2,
  "title": {
    "ko": "그 길 위에서",
    "en": "On the Road"
  },
  "timeline": "2029-04-12",
  "synopsis": {
    "ko": "주인공이 처음으로 도시 밖으로 나간다.",
    "en": "The protagonist ventures outside the city for the first time."
  },
  "characters": ["isia"],
  "locations": ["outer-highway"],
  "contributor": "your-github-username",
  "canon_status": "canonical",
  "temporal_context": {
    "prev_episode": "ep01-genesis",
    "next_episode": null,
    "thematic_echoes": ["ep01-genesis"]
  }
}
```

Optional fields: `themes` (string[]), `canon_events` (string[]), `word_count` (`{ ko?: number, en?: number }`).

Field rules:
- `schema_version` must be `"1.2"` (string, exact)
- `canon_ref` must match `canon_commit` in `canon.lock.json` exactly (a Git commit SHA)
- `timeline` must be `YYYY-MM-DD` (strict ISO date, round-trip validated)
- `characters[]` and `locations[]` entries must exist as files in `canon/`
- `contributor` must be a valid GitHub-style username (alphanumeric, hyphens, underscores; 1–39 chars)
- `canon_status` is `"canonical"` or `"non-canonical"`

---

## Commands

| Command | Description |
|---|---|
| `canon init [dir]` | Scaffold directory structure and config files (non-interactive) |
| `canon setup [dir]` | Interactive wizard: scaffold novel from 4 questions |
| `canon login` | Authenticate CLI with opencanon.co token |
| `canon write <episode-id>` | Generate cross-referenced writing scaffold |
| `canon check [dir]` | Run compliance checks. Exit 0 = all pass |
| `canon check [dir] --schema v1.3` | Run v1.3 checks (8 checks, mixed-version repo) |
| `canon lock [dir]` | Regenerate `canon.lock.json` |
| `canon publish <episode-id>` | Mark episode live on opencanon.co |
| `canon new story <id>` | Create `stories/{id}/metadata.json` template |
| `canon new story <id> --interactive` | Create story metadata interactively |
| `canon new character <id>` | Create `canon/characters/{id}/definition.json` |
| `canon new location <id>` | Create `canon/worldbuilding/locations/{id}.json` |
| `canon migrate [dir]` | Dry-run v1.2 → v1.3 migration (use `--apply` to write) |

All IDs follow: `/^[a-z0-9][a-z0-9_-]*$/` (lowercase, alphanumeric, hyphens, underscores)

---

## Compliance checks (`canon check`)

### v1.2 — 7 checks (default)

| Check ID | Rule |
|---|---|
| `metadata_schema_valid` | All required fields present, correct types, `schema_version === "1.2"` |
| `characters_valid` | Every `characters[]` entry has a corresponding directory in `canon/characters/` |
| `locations_valid` | Every `locations[]` entry has a corresponding file in `canon/worldbuilding/locations/` |
| `timeline_consistent` | `timeline` is a valid `YYYY-MM-DD` date, round-trip validated |
| `continuity_valid` | `temporal_context` episode references resolve to existing episodes (null is valid) |
| `canon_version_match` | `canon_ref` in metadata matches `canon_commit` in `canon.lock.json` |
| `contributor_valid` | `contributor` is a valid GitHub-style username |

### v1.3 — 8 checks (`--schema v1.3`)

All 7 checks above, plus:

| Check ID | Rule |
|---|---|
| `derived_from_valid` | `derivative` status requires `derived_from`; value must resolve to an existing episode |

**Exit codes**: `canon check` exits `0` if all checks pass for all episodes, `1` if any check fails or no episodes exist.

---

## Schema v1.3

v1.3 uses a flat (single-language) metadata structure. Migrate with `canon migrate`.

```json
{
  "schema_version": "1.3",
  "canon_ref": "<commit-hash>",
  "id": "ep02-the-road",
  "episode": 2,
  "lang": "ko",
  "title": "그 길 위에서",
  "timeline": "2029-04-12",
  "synopsis": "주인공이 처음으로 도시 밖으로 나간다.",
  "characters": ["isia"],
  "locations": ["outer-highway"],
  "contributor": "your-github-username",
  "canon_status": "canonical",
  "temporal_context": {
    "prev_episode": "ep01-genesis",
    "next_episode": null,
    "thematic_echoes": []
  }
}
```

New fields vs v1.2:
- `lang` (required) — ISO language code for this metadata file
- `title` / `synopsis` — plain strings (not bilingual objects)
- `canon_status` adds `"derivative"` as a valid value
- `derived_from` (required when `canon_status === "derivative"`) — must reference an existing episode ID

Title and synopsis are Unicode-safety validated (Zalgo/bidi override rejection).

To migrate an existing repo:

```bash
canon migrate              # dry-run, shows what would change
canon migrate --apply      # writes changes
canon migrate --apply --lang en   # override lang (or set default_lang in .canonrc.json)
```

---

## canon.lock.json

Auto-generated by `canon lock`. Do not edit manually.

```json
{
  "schema_version": "canon.lock.v2",
  "canon_commit": "<git-commit-sha>",
  "worldbuilding_hash": "<sha256-of-canon-directory>",
  "hash_algo": "sha256",
  "generated_at": "2026-02-25T17:00:00.000Z",
  "contributors": ["github-username"]
}
```

`canon_version_match` checks that `metadata.canon_ref === canon.lock.json.canon_commit`. Both must be the same Git commit SHA.

---

## Library usage

```ts
import { validateRepo, validateRepoAny } from "@opencanon/canon"
import { loadRepoFromFs, loadRepoFromFsAny } from "@opencanon/canon/adapters/fs"

// v1.2 — filesystem
const model = loadRepoFromFs("/path/to/repo")
const report = validateRepo(model)
console.log(report.summary)
// { score: 1, totalChecks: 7, passingChecks: 7 }

// v1.2 + v1.3 mixed — filesystem
const modelAny = loadRepoFromFsAny("/path/to/repo")
const reportAny = validateRepoAny(modelAny)
console.log(reportAny.schemaVersion) // "check.v3"
```

`RepoCheckReport` shape (v1.2):
```ts
{
  schemaVersion: "check.v2",
  summary: { score: number, totalChecks: number, passingChecks: number },
  totalStories: number,
  passingStories: number,
  stories: StoryCheckReport[]
}
```

`RepoCheckReportV3` shape (mixed / v1.3):
```ts
{
  schemaVersion: "check.v3",
  summary: { score: number, totalChecks: number, passingChecks: number },
  totalStories: number,
  passingStories: number,
  stories: StoryCheckReportV3[]  // 7 or 8 checks per story depending on schema version
}
```

---

## Attestation

When `canon write` cross-references another novel, it automatically sends an attestation to opencanon.co. Novels with more inbound attestations rank higher in the browse feed (composite sort: `compliance_score × log(attest_count + 2)`).

Attestations are:
- **Deduplicated**: one per source per target per day
- **Irreversible**: hashed into `.canon-refs.json` (SHA-256, 12 chars)
- **Passive**: no user action required — `canon write` handles it

---

## Error reference

| Error code | Cause | Fix |
|---|---|---|
| `INVALID_TOKEN` | Token malformed or revoked | Re-run `canon login` with a fresh token from /settings |
| `NOT_REGISTERED` | Repo not in opencanon registry | Visit opencanon.co → sign in → register the repo |
| `FORBIDDEN` | Token owner ≠ repo owner | Use the token for the correct account |
| `NOT_FOUND` | Episode ID doesn't exist in repo | Check `stories/` directory for the correct ID |
| `CONFLICT` | Episode already exists | Use a different episode ID or `--force` |

---

## Links

- **Web platform**: https://opencanon.co
- **Browse novels**: https://opencanon.co/browse
- **Settings / CLI token**: https://opencanon.co/settings
- **Write episode (web)**: https://opencanon.co/write/{username}/{repo}
- **LLM reference**: https://opencanon.co/llms.txt (platform spec)
- **GitHub**: https://github.com/0xjunkim/opencanon-cli
- **npm**: https://www.npmjs.com/package/@opencanon/canon
