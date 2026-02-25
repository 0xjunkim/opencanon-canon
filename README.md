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
canon setup
# Interactive: title → protagonist → genre → synopsis → scaffolds everything
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
│       ├── metadata.json      ← Required. Defines episode structure.
│       ├── content.md         ← Episode text (Markdown)
│       └── ko/                ← Optional locale chapters
│           └── chapter-01.md
├── canon.lock.json            ← Integrity lock (auto-generated)
├── .canonrc.json              ← CLI config (author, default_lang)
└── CONVENTIONS.md             ← Your novel's writing rules
```

---

## metadata.json (schema v1.2)

Every episode requires `metadata.json` in `stories/{id}/`:

```json
{
  "schema_version": "1.2",
  "canon_ref": "{owner}/{repo}",
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

Field rules:
- `schema_version` must be `"1.2"` (string, exact)
- `canon_ref` must be `"{owner}/{repo}"` matching your GitHub repo
- `timeline` must be `YYYY-MM-DD` (strict ISO date)
- `characters[]` and `locations[]` entries must exist as files in `canon/`
- `contributor` must be a non-empty string (your GitHub username)
- `canon_status` is `"canonical"` or `"non-canonical"`

---

## Commands

| Command | Description |
|---|---|
| `canon setup [dir]` | Interactive wizard: scaffold novel from 4 questions |
| `canon login` | Authenticate CLI with opencanon.co token |
| `canon write <episode-id>` | Generate cross-referenced writing scaffold |
| `canon check [dir]` | Run 7 compliance checks. Exit 0 = all pass |
| `canon lock [dir]` | Regenerate `canon.lock.json` |
| `canon publish <episode-id>` | Mark episode live on opencanon.co |
| `canon new story <id>` | Create `stories/{id}/metadata.json` template |
| `canon new character <id>` | Create `canon/characters/{id}/definition.json` |
| `canon new location <id>` | Create `canon/worldbuilding/locations/{id}.json` |

All IDs follow: `/^[a-z0-9][a-z0-9_-]*$/` (lowercase, alphanumeric, hyphens, underscores)

---

## Compliance checks (`canon check`)

Seven checks run per episode. All must pass for the episode to be visible on opencanon.co.

| Check ID | Rule |
|---|---|
| `metadata_schema_valid` | All required fields present, correct types, `schema_version === "1.2"` |
| `characters_valid` | Every `characters[]` entry has a corresponding file in `canon/characters/` |
| `locations_valid` | Every `locations[]` entry has a corresponding file in `canon/worldbuilding/locations/` |
| `timeline_consistent` | `timeline` is a valid `YYYY-MM-DD` date, round-trip validated |
| `continuity_valid` | `temporal_context.prev_episode`, `next_episode`, and `thematic_echoes` resolve to existing episodes (null is valid) |
| `canon_version_match` | `canon_ref` in metadata matches the lock's `canon_commit` (skipped during genesis window) |
| `contributor_valid` | `contributor` field is present and non-empty |

**Exit codes**: `canon check` exits `0` if all checks pass for all episodes, `1` if any check fails or no episodes exist.

---

## Library usage

```ts
import { validateRepo } from "@opencanon/canon"
import { loadRepoFromFs } from "@opencanon/canon/adapters/fs"
import { buildRepoModel } from "@opencanon/canon/adapters/github"

// From filesystem
const model = loadRepoFromFs("/path/to/repo")
const report = validateRepo(model)
console.log(report.summary)
// { score: 1, totalChecks: 7, passingChecks: 7 }

// From GitHub (in a serverless function)
const model = await buildRepoModel({ owner: "0xjunkim", repo: "the-seed", token: process.env.GITHUB_TOKEN })
const report = validateRepo(model)
```

`RepoCheckReport` shape:
```ts
{
  schemaVersion: "check.v2",
  summary: { score: number, totalChecks: number, passingChecks: number },
  stories: StoryCheckReport[]
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
- **GitHub**: https://github.com/0xjunkim/opencanon-canon
- **npm**: https://www.npmjs.com/package/@opencanon/canon
