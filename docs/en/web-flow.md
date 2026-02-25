# Web Flow — opencanon.co

opencanon has two interfaces: the **web platform** (opencanon.co) and the **CLI** (`@opencanon/canon`). They are complementary. The web platform handles registration, authentication, episode submission, and public visibility. The CLI handles local scaffolding, compliance checking, and AI-assisted writing.

---

## Page reference

| Page | URL | Purpose |
|---|---|---|
| Home | `/` | Browse featured novels, get CLI install command |
| Browse | `/browse` | All registered novels sorted by compliance × attestations |
| My Canon | `/my-canon` | Your novels — compliance status, write/view links |
| Setup | `/setup` | Create a new novel (GitHub OAuth required) |
| Write | `/write/{owner}/{repo}` | Submit an episode via web form |
| Story | `/story/{owner}/{repo}` | Novel overview — episode list + canon health badge |
| Episode | `/story/{owner}/{repo}/{episode}` | Full episode reader |
| Notebook | `/notebook` | Personal writing notes (syncs into `canon write` context) |
| Settings | `/settings` | CLI token, integrations (X, Moltbook) |
| About | `/about` | Protocol description |

---

## Novel registration flow (web)

1. Sign in at opencanon.co with GitHub
2. Click **소설 만들기 / Create Novel** or go to `/setup`
3. Answer 4 questions: novel title → protagonist → genre → synopsis
4. The web wizard:
   - Creates a GitHub repo via your OAuth token
   - Scaffolds `canon/`, `stories/`, `.canonrc.json`, `CONVENTIONS.md`
   - Registers the novel in the opencanon registry (KV store)
   - Returns you to the story page
5. Clone the repo: `git clone https://github.com/{username}/{repo}`
6. Authenticate CLI: `canon login`

---

## Episode submission flow (web)

Go to `/write/{owner}/{repo}` (linked from My Canon).

### AI-assisted writing (no CLI required)

1. Click **AI로 집필하기 / Write with AI** to expand the context block
2. The context block loads your canon structure (characters, locations, world rules) as a formatted prompt
3. Click **프롬프트 복사 / Copy Prompt**
4. Paste into Claude, ChatGPT, or any AI
5. The AI writes within your canon structure
6. Paste the result back into the **본문 / Content** field
7. Fill in: story name, episode name, title (KO+EN), synopsis, timeline, characters, locations
8. Click **검증 / Check** → verify all fields pass local validation
9. Click **제출 / Submit** → episode committed to GitHub

### Manual submission (without AI)

Write the episode yourself (plain text or Markdown), then use the same form to submit.

---

## Canon health badge

On every story page (`/story/{owner}/{repo}`), a health badge shows the current compliance status:

```
● canon · live · passed    ∨
```

- `passed` — all 7 compliance checks passing (score = 1.0)
- `failed` — one or more checks failing (score < 1.0)

Click the badge to expand the full check breakdown.

**Cache:** The compliance snapshot is cached for 15 minutes. After pushing changes directly to GitHub, wait up to 15 minutes for the badge to update. After submitting via the web form, the cache is invalidated immediately.

---

## Notebook

The notebook at `/notebook` is a personal writing space that syncs into `canon write` context.

- **Writes**: Saved on blur (debounced), or click **↻ sync**
- **Storage**: 90 days of daily snapshots; sidebar shows last 14 days; `?date=YYYY-MM-DD` for history
- **Sync into canon write**: The CLI reads the notebook via API during `canon write` (requires `canon login`)
- **Size limit**: 50KB per save

Use the notebook to jot character notes, plot outlines, and ideas between writing sessions. These notes will automatically appear as context in your next `canon write`.

---

## CLI token

Generated at `/settings` → **CLI Token** → **Generate**.

Format: `oct_` + 32 hex chars (128-bit entropy UUID).
Permissions: read/write your own novels only. Cannot access other users' data.

To revoke: go to `/settings` → **CLI Token** → **Revoke All**. All existing tokens for your account become invalid immediately.

---

## Attestation and discovery

When `canon write` cross-references another novel, that novel receives an inbound attestation (+1). Attestations affect browse sort order:

```
composite_score = compliance_score × log(attest_count + 2)
```

Novels with higher attestation counts surface organically in the browse feed — no editorial curation needed.

**Genesis period** (first 30 days after registration): Novel appears in the "new canons" section with a `canon in progress` badge. After 30 days, moves to the main ranked feed.

---

## CLI ↔ Web: which to use when

| Task | Web | CLI |
|---|---|---|
| Create novel | ✓ (recommended) | `canon setup` |
| Write episode | ✓ (with AI guide) | `canon write` + AI |
| Submit episode | ✓ (form) | commit + `canon publish` |
| Check compliance | ✓ (story page badge) | `canon check` |
| Take notes | ✓ (notebook) | — |
| Manage tokens | ✓ (settings) | — |
| Lock file update | — | `canon lock` |
| Add character | — | `canon new character` |
| Add location | — | `canon new location` |
