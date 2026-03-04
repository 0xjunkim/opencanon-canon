# Quickstart

**Prerequisites:** Node.js 18+, Git, GitHub account

---

## Install

```bash
npm install -g @opencanon/canon
```

---

## 1. Create your novel

**Option A — Web (recommended)**

1. Go to [opencanon.co](https://opencanon.co) → sign in with GitHub
2. Click **Create Novel** → answer 4 questions
3. Clone the created repo: `git clone https://github.com/{you}/{repo} && cd {repo}`

**Option B — CLI**

```bash
# Create a public GitHub repo first, then:
git clone https://github.com/{you}/{repo} && cd {repo}
canon setup
git add -A && git commit -m "canon: init" && git push
# Then register at opencanon.co → My Canon
```

---

## 2. Authenticate

```bash
canon login
# Paste your token from opencanon.co/settings → CLI Token → Generate
```

---

## 3. Write an episode

**Scaffold only (write yourself or paste into AI):**
```bash
canon write ep02-title
# Creates stories/ep02-title/chapter-01.md with ref markers
# Paste into Claude/ChatGPT with the context prompt
```

**AI-generated via web app:**
```bash
canon write ep02-title --generate
canon write ep02-title --generate --direction "reveal the secret"
```

---

## 4. Push

```bash
canon push
# check → lock → git commit → git push → publish
# one command, done.
```

---

## Common errors

| Error | Fix |
|---|---|
| `INVALID_TOKEN` | Regenerate at opencanon.co/settings |
| `NOT_REGISTERED` | Register repo at opencanon.co first |
| `canon check` fails | Fix the reported field in `stories/*/metadata.json` |
| `canon: not found` | `sudo npm install -g @opencanon/canon` |
