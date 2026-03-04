# Commands

All commands: `canon <command> --help` for inline docs.
ID constraint: lowercase alphanumeric + hyphens/underscores. `/^[a-z0-9][a-z0-9_-]*$/`

---

## canon setup [dir]

Interactive wizard. Scaffolds a complete novel repo from 5 questions.

```bash
canon setup           # current directory
canon setup ./novel   # specified directory
```

Creates: `canon/`, `stories/ep01-beginning/`, `.canonrc.json`, `CONVENTIONS.md`, initial git commit.

---

## canon login

Authenticate with opencanon.co.

```bash
canon login
canon login --host https://your-instance.com
```

Token source: opencanon.co/settings → **CLI Token** → Generate (`oct_...`)
Saved to `~/.canon/config.json` (mode `0600`).

---

## canon write \<slug\>

Collect 3-hop context and scaffold (or generate) the next episode.

```bash
canon write ep02-title
canon write ep02-title --generate
canon write ep02-title --generate --direction "reveal the secret here"
canon write ep02-title --no-refs --no-notebook
```

| Option | Default | Description |
|---|---|---|
| `--generate` | off | Call web app AI → stream prose to chapter-01.md |
| `--direction` | `"continue naturally"` | Writing direction hint (used with --generate) |
| `--no-refs` | — | Skip cross-canon context |
| `--no-notebook` | — | Skip notebook context |

**3 reference sources:**
1. Self — latest chapter from this repo (≤800 chars)
2. Notebook — opencanon.co/notebook content (≤600 chars)
3. Cross — up to 3 other registered novels (≤200 chars each)

Ref hashes saved to `.canon-refs.json`. Cross-refs trigger attestation (+1) on the target novel.

---

## canon push [dir]

Full pipeline in one command.

```bash
canon push
canon push --message "ep03: resolution arc"
canon push --dry-run       # preview steps without executing
canon push --no-publish    # skip publish after git push
```

Steps: `canon check` → `canon lock` → `git add -A && git commit && git push` → `canon publish`

Auto-generates commit message from new story slugs if `--message` is omitted.

---

## canon check [dir]

Run 7 compliance checks. Exit 0 = all pass, exit 1 = any fail.

```bash
canon check
canon check ./other-novel
```

Checks: `metadata_schema_valid`, `characters_valid`, `locations_valid`, `timeline_consistent`, `continuity_valid`, `canon_version_match`, `contributor_valid`

---

## canon lock [dir]

Regenerate `canon.lock.json`. Run after adding characters, locations, or structural changes.

```bash
canon lock
canon lock --update-refs   # also updates canon_ref in all metadata.json files
```

---

## canon publish [dir]

Register or update canon on opencanon.co. Runs `canon check` first.

```bash
canon publish
canon publish --dry-run
```

---

## canon new

Create templates for new canon entities.

```bash
canon new story <id>        # stories/<id>/metadata.json
canon new character <id>    # canon/characters/<id>/definition.json
canon new location <id>     # canon/worldbuilding/locations/<id>.json
```

---

## canon init [dir]

Minimal scaffold (no interactive questions). Prefer `canon setup` for new novels.

```bash
canon init
canon init ./my-novel
```
