# Command Reference — @opencanon/canon

All commands accept `--help` for inline documentation.
ID constraint for all `<id>` arguments: `/^[a-z0-9][a-z0-9_-]*$/`

---

## canon setup [dir]

Interactive wizard that scaffolds a complete novel repository from 4 questions.

```bash
canon setup           # scaffold in current directory
canon setup ./my-repo # scaffold in specified directory
```

**What it creates:**
- `canon/characters/{protagonist-id}/definition.json`
- `canon/worldbuilding/locations/{inferred-location}.json`
- `stories/ep01-beginning/metadata.json` + `content.md`
- `.canonrc.json` — CLI config (author, default_lang)
- `CONVENTIONS.md` — writing conventions template
- `GETTING-STARTED.md` — author guide

**Questions asked:**
1. Novel title
2. Protagonist name (+ Latin ID if name is non-ASCII)
3. Genre (free text)
4. Synopsis / world background (free text)
5. One thematic keyword

**Note:** Does not create or push a GitHub repo. Create the repo at https://github.com/new first, clone it, then run `canon setup` inside.

---

## canon login

Authenticate the CLI with your opencanon.co token.

```bash
canon login
# Prompts:
#   Host [https://opencanon.co]:
#   Token: oct_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Token source: https://opencanon.co/settings → CLI Token → Generate

Credentials saved to `~/.canon/config.json` with mode `0600`.

To verify authentication:
```bash
canon login   # re-run, it will show current auth status
```

---

## canon write \<episode-id\>

Generate a 3-hop cross-referenced writing scaffold for the given episode ID.

```bash
canon write ep02-the-road
canon write ep03-turning-point --no-notebook   # skip notebook context
canon write ep04-arrival --no-refs             # skip cross-references
canon write ep05-end --host https://other.co  # custom API host
```

**Context sources (bounded, lossy):**
1. **self** — latest episode from current repo (≤800 chars, truncated)
2. **notebook** — personal notes from opencanon.co/notebook (≤600 chars, requires token)
3. **cross** — snippets from ≤3 other registered novels (≤200 chars each)

Each source is hashed SHA-256 (12 chars) and stored in `.canon-refs.json`. Hashes are irreversible — the original content cannot be reconstructed from them. Cross-referenced novels receive one attestation (+1 inbound ref on opencanon.co).

**Output:** `stories/{episode-id}/scaffold.md` with `<!--ref:#hash source:self/notebook/cross-->` markers.

**After generation:** Paste the context prompt into any AI (Claude, ChatGPT, Gemini, etc.) to write the episode. Then submit via https://opencanon.co/write/{username}/{repo}.

**.canon-refs.json format:**
```json
[
  {
    "episode": "ep02-the-road",
    "createdAt": "2026-02-25T17:00:00.000Z",
    "refs": [
      { "hash": "a3f9c2b1e4d7", "source": "self", "storyId": "ep01-genesis", "preview": "The city was quiet...", "createdAt": "..." },
      { "hash": "7e2c1a9b3f05", "source": "cross", "owner": "0xjunkim", "repo": "the-seed", "preview": "...", "createdAt": "..." }
    ]
  }
]
```

---

## canon check [dir]

Run all 7 compliance checks on every episode in the repo.

```bash
canon check          # check current directory
canon check ./repo   # check specified directory
```

**Exit codes:**
- `0` — all 7 checks pass for all episodes
- `1` — any check fails, or no episodes found

**Output format:**
```
stories/ep01-genesis
  ✓ metadata_schema_valid
  ✓ characters_valid
  ✓ locations_valid
  ✓ timeline_consistent
  ✓ continuity_valid
  ✓ canon_version_match
  ✓ contributor_valid

1/1 stories passing. Score: 1.00
```

**Check IDs** (stable, never removed):

| ID | Validates |
|---|---|
| `metadata_schema_valid` | Required fields, correct types, `schema_version === "1.2"` |
| `characters_valid` | Each `characters[]` entry has a file in `canon/characters/` |
| `locations_valid` | Each `locations[]` entry has a file in `canon/worldbuilding/locations/` |
| `timeline_consistent` | `timeline` is valid `YYYY-MM-DD`, round-trip stable |
| `continuity_valid` | `prev_episode`, `next_episode`, `thematic_echoes` resolve (null ok) |
| `canon_version_match` | `canon_ref` matches `canon.lock.json` (skipped in genesis window: first 30 days) |
| `contributor_valid` | `contributor` is present and non-empty string |

---

## canon lock [dir]

Regenerate `canon.lock.json` from the current state of `canon/`.

```bash
canon lock
canon lock ./repo
```

**When to run:**
- After adding/modifying characters or locations
- After changing `canon_ref` in metadata
- Before publishing if `canon_version_match` is failing

**Genesis exception:** During the first 30 days after repo creation, `canon_version_match` is skipped automatically. Lock file is still generated.

**canon.lock.json format:**
```json
{
  "schema_version": "lock.v1",
  "canon_commit": "{owner}/{repo}",
  "lockedAt": "2026-02-25T17:00:00.000Z",
  "checksum": "sha256:..."
}
```

---

## canon publish \<episode-id\>

Mark an episode as published on opencanon.co.

```bash
canon publish ep01-genesis
canon publish ep02-the-road --host https://opencanon.co
```

**Requirements:**
- Must be authenticated (`canon login`)
- Repo must be registered on opencanon.co
- Token owner must match repo owner

**What it does:** Sends a POST to `/api/publish` with the token + episode ID. Updates the episode's visibility on the story page. Does **not** commit to git (commit first).

---

## canon new story \<id\>

Create a new episode metadata template.

```bash
canon new story ep02-the-road
# Creates: stories/ep02-the-road/metadata.json
```

Populates `canon_ref` from `.canonrc.json` if available.

---

## canon new character \<id\>

Create a new character definition.

```bash
canon new character isia
# Creates: canon/characters/isia/definition.json
```

After creating, run `canon lock` to update `canon.lock.json`.

---

## canon new location \<id\>

Create a new location definition.

```bash
canon new location seoul-tower
# Creates: canon/worldbuilding/locations/seoul-tower.json
```

After creating, run `canon lock` to update `canon.lock.json`.

---

## canon init [dir]

Low-level scaffold: creates directory structure without the interactive wizard.

```bash
canon init           # scaffold in current directory
canon init ./repo    # scaffold in specified directory
```

Creates: `canon/characters/`, `canon/worldbuilding/locations/`, `stories/`, `.canonrc.json`, `CONVENTIONS.md`

**Prefer `canon setup` for new novels** — it includes the interactive questions and pre-populates characters and locations.

---

## Global options

| Flag | Description |
|---|---|
| `--host <url>` | Override API host (default: `https://opencanon.co`) |
| `--version` | Print CLI version |
| `--help` | Show help for any command |
