# @opencanon/canon

공유 픽션 세계관을 위한 캐논 월드빌딩 CLI 및 검증 라이브러리.

## 개요

`@opencanon/canon`은 두 가지를 제공합니다:

1. **CLI** (`canon`) — 캐논 월드빌딩 저장소 생성, 검증, 관리
2. **라이브러리** — 다른 도구나 플랫폼에 캐논 준수 검사를 통합하기 위한 재사용 가능한 검증 로직

## 설치

```bash
# 글로벌 (CLI 사용)
npm install -g @opencanon/canon

# 로컬 (라이브러리 사용)
npm install @opencanon/canon
```

## CLI 명령어

### `canon init [dir]`

새 캐논 월드빌딩 저장소를 생성합니다:

- `canon/characters/` — 캐릭터 정의
- `canon/worldbuilding/locations/` — 장소 정의
- `stories/` — 스토리 디렉터리
- `CONVENTIONS.md` — 저장소 규칙 참조
- `.canonrc.json` — 프로젝트 설정

### `canon new <type> <id>`

템플릿으로 새 엔티티를 생성합니다.

```bash
canon new story my-story        # stories/my-story/metadata.json
canon new character alice        # canon/characters/alice/definition.json
canon new location market-square # canon/worldbuilding/locations/market-square.json
```

ID는 소문자 영숫자, 하이픈, 언더스코어만 가능합니다.

### `canon check [dir]`

캐논 저장소에 대해 준수 검사를 실행합니다.

- 모든 스토리가 통과하면 종료 코드 **0**
- 하나라도 실패하거나 스토리가 없으면 종료 코드 **1**

스토리당 7개 검사 수행:

| 검사 ID | 설명 |
|---|---|
| `metadata_schema_valid` | 필수 필드 존재, 올바른 타입, `schema_version === "1.2"` |
| `characters_valid` | 참조된 캐릭터가 `canon/characters/`에 존재 |
| `locations_valid` | 참조된 장소가 `canon/worldbuilding/locations/`에 존재 |
| `timeline_consistent` | 타임라인이 유효한 ISO 날짜 (YYYY-MM-DD, 엄격한 왕복 검증) |
| `continuity_valid` | 시간 맥락 참조가 기존 에피소드를 가리킴 |
| `canon_version_match` | `canon_ref`가 `canon.lock.json` 커밋과 일치 |
| `contributor_valid` | `contributor` 필드가 존재하고 비어있지 않음 |

### `canon lock [dir]`

현재 `canon/` 내용과 git HEAD로 `canon.lock.json`을 재생성합니다.

- 최소 1개 커밋이 있는 git 저장소 필요
- 생성 전 준수 검사 사전 실행 — 스토리 하나라도 실패하면 lock 거부 (exit 1)
- 최초 lock (`canon.lock.json` 미존재) 시 사전 검사 생략
- 해시: 정렬된 파일 경로와 내용에 대한 SHA-256 (`경로 + NUL + 바이트 + NUL`)
- 결정론적: 동일 입력은 항상 동일한 해시 생성

## 라이브러리 사용

### 코어 (순수 검증)

```ts
import { validateRepo, type RepoModel, type RepoCheckReport } from "@opencanon/canon"

const report: RepoCheckReport = validateRepo(model)
// report.schemaVersion === "check.v2"
// report.summary — { score, totalChecks, passingChecks }
// report.stories — 스토리별 검사 결과
// report.totalStories / report.passingStories
```

### 파일시스템 어댑터

```ts
import { loadRepoFromFs } from "@opencanon/canon/adapters/fs"

const model: RepoModel = loadRepoFromFs("/path/to/repo")
```

### GitHub 어댑터 (순수 변환)

```ts
import { buildRepoModel } from "@opencanon/canon/adapters/github"
import type { GitHubRepoInput } from "@opencanon/canon"

// 미리 가져온 GitHub API 데이터 제공 (tree + 파일 내용)
const model = buildRepoModel({ tree, files })
```

GitHub 어댑터는 순수 변환 함수입니다. 파싱된 GitHub API 응답을 받아 `RepoModel`을 반환합니다. HTTP 요청을 수행하지 않으며, 데이터 가져오기는 애플리케이션이 담당합니다.

## 저장소 구조

```
your-canon-repo/
  canon/
    characters/
      <id>/definition.json
    worldbuilding/
      locations/
        <id>.json
  stories/
    <slug>/
      metadata.json
      chapter-01.md
  canon.lock.json
  CONVENTIONS.md
  .canonrc.json
```

## 메타데이터 스키마 (v1.2)

각 스토리에는 `metadata.json`이 필요합니다:

```json
{
  "schema_version": "1.2",
  "canon_ref": "<commit-sha>",
  "id": "my-story",
  "episode": 1,
  "title": { "ko": "...", "en": "..." },
  "timeline": "2025-01-15",
  "synopsis": { "ko": "...", "en": "..." },
  "characters": ["alice", "bob"],
  "locations": ["market-square"],
  "contributor": "github-username",
  "canon_status": "canonical"
}
```

## Lock 파일 (canon.lock.v2)

```json
{
  "schema_version": "canon.lock.v2",
  "canon_commit": "<git-HEAD-sha>",
  "worldbuilding_hash": "<sha256-hex>",
  "hash_algo": "sha256",
  "generated_at": "2025-01-15T00:00:00.000Z",
  "contributors": ["github-username"]
}
```

## v1.1에서 마이그레이션

[MIGRATION-v1.2.md](../../MIGRATION-v1.2.md) 참조.

## 라이선스

MIT
