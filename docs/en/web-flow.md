# CLI ↔ Web App

The CLI and web app are complementary. Use whichever fits your workflow.

---

## Which to use

| Task | Web | CLI |
|---|---|---|
| Create novel | ✓ recommended | `canon setup` |
| Write episode (AI) | ✓ /write page | `canon write --generate` |
| Submit episode | ✓ form | `canon push` |
| Check compliance | ✓ story badge | `canon check` |
| Notes between sessions | ✓ /notebook | — |
| Manage tokens | ✓ /settings | — |
| Lock file / add entities | — | `canon lock`, `canon new` |

---

## Write pipeline (CLI)

```
canon write ep03-title --generate --direction "hint"
  ↓
  ① reads own latest chapter (local)
  ② fetches notebook from opencanon.co/api/notebook
  ③ fetches cross-canon registry from opencanon.co/api/registry
  ↓
  POST /api/cli/generate → SSE stream → chapter-01.md
  ↓
canon push
  ↓
  canon check → canon lock → git push → /api/publish
```

---

## Notebook sync

Notes at opencanon.co/notebook are automatically included as context in `canon write`.
Write → save → next `canon write` picks it up. No manual sync needed.

---

## Attestation

When `canon write` cross-references another novel, that novel receives +1 attestation.
Attestation affects browse ranking: `score = compliance × log(attestations + 2)`

---

## Token

Format: `oct_` + 32 hex chars. Scope: read/write your own novels only.

Generate: opencanon.co/settings → CLI Token → Generate
Revoke: opencanon.co/settings → CLI Token → Revoke All
