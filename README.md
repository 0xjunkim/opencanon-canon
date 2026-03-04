# @opencanon/canon

CLI for [opencanon](https://opencanon.co) — scaffold, write, validate, and publish fiction canons.

```bash
npm install -g @opencanon/canon
```

---

## Quickstart

```bash
# 1. Create a novel
canon setup

# 2. Authenticate
canon login

# 3. Write the next episode (AI-generated via web app)
canon write ep02-title --generate --direction "continue naturally"

# 4. Publish
canon push
```

That's the full loop. See [docs/en/quickstart.md](docs/en/quickstart.md) for detail.

---

## Commands

| Command | Description |
|---|---|
| `canon setup` | Interactive wizard — scaffold novel, write ep01 |
| `canon login` | Save CLI token from opencanon.co/settings |
| `canon write <slug>` | Scaffold episode with cross-referenced context |
| `canon write <slug> --generate` | Generate prose via web app AI (requires login) |
| `canon push` | check → lock → commit → push → publish |
| `canon check` | Run 7 compliance checks (exit 0 = pass) |
| `canon lock` | Regenerate canon.lock.json |
| `canon publish` | Register episode on opencanon.co |
| `canon new story <id>` | Create episode metadata template |
| `canon new character <id>` | Create character definition |
| `canon new location <id>` | Create location definition |

---

## Repo structure

```
canon/
  characters/{id}/definition.json
  worldbuilding/locations/{id}.json
stories/{slug}/
  metadata.json      ← required
  chapter-01.md      ← episode content
.canonrc.json
canon.lock.json
```

---

## Links

- Web platform: [opencanon.co](https://opencanon.co)
- Docs: [docs/en/](docs/en/)
- LLM reference: [llms.txt](llms.txt)
- npm: [@opencanon/canon](https://www.npmjs.com/package/@opencanon/canon)

---

MIT
