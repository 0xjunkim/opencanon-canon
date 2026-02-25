# 빠른 시작 — opencanon/canon

처음부터 첫 에피소드 발행까지. 예상 소요 시간: 10~15분.

---

## 사전 준비

- Node.js 18+ (`node --version`)
- Git (`git --version`)
- GitHub 계정 (https://github.com/signup)

---

## 1. CLI 설치

```bash
npm install -g @opencanon/canon
canon --version   # 0.4.0 출력 확인
```

---

## 2. 소설 만들기

### 방법 A — 웹 설정 (권장)

1. https://opencanon.co 접속
2. **로그인** → GitHub OAuth 승인
3. **소설 만들기** 클릭
4. 4가지 질문 답변: 소설 제목, 주인공 이름, 장르, 한 줄 줄거리
5. opencanon.co가 GitHub 레포를 생성하고 자동 등록
6. 새 레포 클론:
   ```bash
   git clone https://github.com/{아이디}/{레포이름}
   cd {레포이름}
   ```

### 방법 B — CLI 설정

```bash
# 먼저 https://github.com/new 에서 공개 레포 생성
git clone https://github.com/{아이디}/{레포이름}
cd {레포이름}

canon setup
# 인터랙티브 마법사:
#   1. 소설 제목
#   2. 주인공 이름
#   3. 장르 (SF, 판타지, 현대물, 로맨스 등)
#   4. 줄거리/세계관 배경 (자유 입력)
#   5. 이 소설에 심을 키워드 하나 (상처, 기쁨, 연결 등)

git add -A
git commit -m "canon: setup"
git push origin main
```

CLI 설정 후, https://opencanon.co → 로그인 → **내 소설** 에서 레포 등록 안내가 표시됩니다.

---

## 3. CLI 토큰 발급

1. https://opencanon.co/settings 접속
2. **CLI 토큰** 섹션에서 **생성** 클릭
3. `oct_...` 형식의 토큰 복사

```bash
canon login
# 호스트 입력 [https://opencanon.co]: (엔터)
# 토큰 입력: oct_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# ✓ {아이디}로 인증 완료
```

토큰은 `~/.canon/config.json`에 권한 `0600`으로 저장됩니다.

---

## 4. 첫 에피소드 작성

```bash
canon write ep01-genesis
```

출력 예시:
```
[canon write] ep01-genesis
컨텍스트를 수집하고 있습니다...

  ✓ 자체 참조: ep01-seed (#a3f9c2b1e4d7)
  ○ 수첩: 비어있거나 토큰 없음
  ✓ 교차 참조: 0xjunkim/the-seed (#7e2c1a)

Scaffold가 저장되었습니다: stories/ep01-genesis/scaffold.md
컨텍스트 프롬프트 준비됨 — AI에 붙여넣어 집필을 시작하세요.
```

scaffold 파일 예시:
```markdown
<!--ref:#a3f9c2b1e4d7 source:self-->
<!-- 내 마지막 챕터 컨텍스트 -->

<!--ref:#7e2c1a source:cross-->
<!-- 다른 캐논 스니펫 -->

## 에피소드: ep01-genesis

[여기에 에피소드를 작성하세요]
```

**생성된 컨텍스트 프롬프트를 Claude, ChatGPT 등 원하는 AI에 붙여넣으세요.** AI가 여러분의 캐논 구조 안에서 에피소드를 작성합니다.

또는 웹 폼 사용: https://opencanon.co/write/{아이디}/{레포} → **AI로 집필하기** 클릭 시 동일한 프롬프트를 제공합니다.

---

## 5. 에피소드 제출

작성 후 웹 폼으로 제출:

1. https://opencanon.co/write/{아이디}/{레포} 접속
2. 이야기 이름, 에피소드 이름, 제목(한국어+영어), 줄거리, 시간대, 등장인물, 장소, 본문 입력
3. **검증** 클릭 → **제출** 클릭

또는 직접 커밋 (로컬에서 작성한 경우):

```bash
# stories/ep01-genesis/ 안에 다음 파일이 있는지 확인:
#   metadata.json  (canon-spec.md 참조)
#   content.md     (에피소드 본문)

canon check
# ✓ metadata_schema_valid
# ✓ characters_valid
# ...
# 7/7 검사 통과

git add -A
git commit -m "story: ep01-genesis — 첫 에피소드"
git push
```

---

## 6. 발행

```bash
canon publish ep01-genesis
# ✓ 발행됨 → https://opencanon.co/story/{아이디}/{레포}
```

에피소드가 공개됩니다. 스토리 페이지에서 준수율 배지를 확인하세요: `canon · live · passed`.

---

## 다음 단계

- 캐릭터 추가: `canon new character {id}`
- 장소 추가: `canon new location {id}`
- 다음 에피소드 작성: `canon write ep02-{제목}`
- 세션 사이에 메모하기: https://opencanon.co/notebook (자동으로 `canon write` 컨텍스트에 포함)
- 전체 소설 보기: https://opencanon.co/browse

---

## 자주 발생하는 오류

| 증상 | 해결책 |
|---|---|
| `canon: command not found` | Node.js PATH 문제 — `sudo npm install -g @opencanon/canon` 재설치 또는 `npx @opencanon/canon setup` 시도 |
| 로그인 시 `INVALID_TOKEN` | 토큰 만료 또는 오입력 — /settings 에서 새 토큰 발급 |
| 발행 시 `NOT_REGISTERED` | opencanon.co에서 레포 등록 먼저 필요 (2단계 참조) |
| `canon check` 1 종료 (✗ 표시) | `metadata.json`의 해당 필드 수정 — 가장 흔한 원인: `locations[]` 파일 없음, `timeline` 형식 오류 |
| 제출 시 `CONFLICT` | 해당 ID의 에피소드 이미 존재 — 다른 ID 사용 |
