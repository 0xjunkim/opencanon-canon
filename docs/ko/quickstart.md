# 빠른 시작

**필요:** Node.js 18+, Git, GitHub 계정

---

## 설치

```bash
npm install -g @opencanon/canon
```

---

## 1. 소설 만들기

**방법 A — 웹 (권장)**

1. [opencanon.co](https://opencanon.co) → GitHub 로그인
2. **소설 만들기** → 4가지 질문 답변
3. 생성된 레포 클론: `git clone https://github.com/{아이디}/{레포} && cd {레포}`

**방법 B — CLI**

```bash
# 먼저 github.com/new 에서 공개 레포 생성
git clone https://github.com/{아이디}/{레포} && cd {레포}
canon setup
git add -A && git commit -m "canon: init" && git push
# opencanon.co → 내 소설에서 등록
```

---

## 2. 로그인

```bash
canon login
# opencanon.co/settings → CLI 토큰 → 생성 → 붙여넣기
```

---

## 3. 에피소드 집필

**직접 쓰기 (또는 AI에 붙여넣기):**
```bash
canon write ep02-제목
# stories/ep02-제목/chapter-01.md 생성 (ref 마커 포함)
```

**웹앱 AI로 자동 생성:**
```bash
canon write ep02-제목 --generate
canon write ep02-제목 --generate --direction "여기서 반전 넣기"
```

---

## 4. 발행

```bash
canon push
# check → lock → git commit → push → publish 자동 처리
```

---

## 오류 대처

| 오류 | 해결 |
|---|---|
| `INVALID_TOKEN` | opencanon.co/settings에서 토큰 재발급 |
| `NOT_REGISTERED` | opencanon.co에서 레포 등록 먼저 |
| `canon check` 실패 | `stories/*/metadata.json` 오류 항목 수정 |
