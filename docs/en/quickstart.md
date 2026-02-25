# Quickstart — opencanon/canon

This guide takes you from zero to your first published episode. Estimated time: 10–15 minutes.

---

## Prerequisites

- Node.js 18+ (`node --version`)
- Git (`git --version`)
- A GitHub account (https://github.com/signup)

---

## 1. Install the CLI

```bash
npm install -g @opencanon/canon
canon --version   # should print 0.4.0
```

---

## 2. Create your novel

### Option A — Web setup (recommended)

1. Go to https://opencanon.co
2. Click **로그인 / Sign in** → authorize GitHub OAuth
3. Click **소설 만들기 / Create Novel**
4. Answer 4 questions: novel title, protagonist name, genre, one-line synopsis
5. opencanon.co creates a GitHub repo and registers the novel automatically
6. Clone your new repo:
   ```bash
   git clone https://github.com/{your-username}/{repo-slug}
   cd {repo-slug}
   ```

### Option B — CLI setup

```bash
# Create a public GitHub repo first at https://github.com/new
git clone https://github.com/{your-username}/{repo-name}
cd {repo-name}

canon setup
# Interactive wizard:
#   1. Novel title
#   2. Protagonist name
#   3. Genre (SF, fantasy, contemporary, romance, ...)
#   4. Synopsis / world background (free text)
#   5. One keyword for this story (pain, joy, connection, ...)

git add -A
git commit -m "canon: setup"
git push origin main
```

After the CLI setup, register the repo at https://opencanon.co → sign in → **내 소설 / My Canon** will show a registration prompt.

---

## 3. Get your CLI token

1. Go to https://opencanon.co/settings
2. Under **CLI Token**, click **Generate**
3. Copy the `oct_...` token (32 hex chars after the prefix)

```bash
canon login
# Enter host [https://opencanon.co]: (press Enter)
# Enter token: oct_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# ✓ Authenticated as {username}
```

Token is saved to `~/.canon/config.json` with `0600` permissions.

---

## 4. Write your first episode

```bash
canon write ep01-genesis
```

Output:
```
[canon write] ep01-genesis
컨텍스트를 수집하고 있습니다...

  ✓ 자체 참조: ep01-seed (#a3f9c2b1e4d7)
  ○ 수첩: 비어있거나 토큰 없음
  ✓ 교차 참조: 0xjunkim/the-seed (#7e2c1a)

Scaffold saved to stories/ep01-genesis/scaffold.md
Context prompt ready — paste into your AI to begin writing.
```

The scaffold file contains:
```markdown
<!--ref:#a3f9c2b1e4d7 source:self-->
<!-- Context from your last chapter -->

<!--ref:#7e2c1a source:cross-->
<!-- Snippet from another canon -->

## Episode: ep01-genesis

[Write your episode here]
```

**Paste the context prompt into Claude, ChatGPT, or any AI of your choice.** The AI will write within your established canon structure.

Alternatively, use the web form: https://opencanon.co/write/{username}/{repo} — click **AI로 집필하기 / Write with AI** to get the same prompt.

---

## 5. Submit the episode

After writing, submit via the web form:

1. Go to https://opencanon.co/write/{your-username}/{repo}
2. Fill in: story name, episode name, title (KO+EN), synopsis, timeline, characters, locations, episode text
3. Click **검증 / Check** → then **제출 / Submit**

Or commit directly (if you wrote locally):

```bash
# Ensure stories/ep01-genesis/ has:
#   metadata.json  (see canon-spec.md for schema)
#   content.md     (your episode text)

canon check
# ✓ metadata_schema_valid
# ✓ characters_valid
# ...
# 7/7 checks passing

git add -A
git commit -m "story: ep01-genesis — first episode"
git push
```

---

## 6. Publish

```bash
canon publish ep01-genesis
# ✓ Published → https://opencanon.co/story/{username}/{repo}
```

Your episode is now live. Visit the story page to see the compliance badge: `canon · live · passed`.

---

## Next steps

- Add more characters: `canon new character {id}`
- Add locations: `canon new location {id}`
- Write episode 2: `canon write ep02-{title}`
- Take notes between sessions: https://opencanon.co/notebook (syncs into `canon write` context)
- View all novels: https://opencanon.co/browse

---

## Common errors

| Symptom | Fix |
|---|---|
| `canon: command not found` | Node.js PATH issue — try `npx @opencanon/canon setup` or reinstall with `sudo npm install -g @opencanon/canon` |
| `INVALID_TOKEN` on login | Token expired or mistyped — generate a new one at /settings |
| `NOT_REGISTERED` on publish | Register the repo at opencanon.co first (step 2) |
| `canon check` exit 1 with ✗ | Fix the reported field in `metadata.json` — most common: missing `locations[]` file or wrong `timeline` format |
| `CONFLICT` on write submit | An episode with this ID already exists — choose a different ID |
