import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { execSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const CLI = join(import.meta.dirname, "..", "cli.js")

function run(cmd: string, opts?: { cwd?: string }) {
  return execSync(cmd, { encoding: "utf-8", stdio: "pipe", ...opts })
}

function tryRun(cmd: string, opts?: { cwd?: string }) {
  try {
    const stdout = run(cmd, opts)
    return { code: 0, stdout, stderr: "" }
  } catch (e: any) {
    return { code: e.status, stdout: e.stdout ?? "", stderr: e.stderr ?? "" }
  }
}

// ── canon new ──

describe("canon new commands", () => {
  it("canon new story creates correct template structure", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-new-story-"))
    run(`node ${CLI} init ${tmp}`)
    run(`node ${CLI} new story ep01 -d ${tmp}`)

    const metaPath = join(tmp, "stories", "ep01", "metadata.json")
    assert.ok(existsSync(metaPath))
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"))
    assert.equal(meta.schema_version, "1.2")
    assert.equal(meta.id, "ep01")
    assert.equal(meta.episode, 0)
    assert.equal(meta.canon_status, "non-canonical")
  })

  it("canon new character creates definition.json", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-new-char-"))
    run(`node ${CLI} init ${tmp}`)
    run(`node ${CLI} new character alice -d ${tmp}`)

    const defPath = join(tmp, "canon", "characters", "alice", "definition.json")
    assert.ok(existsSync(defPath))
    const def = JSON.parse(readFileSync(defPath, "utf-8"))
    assert.equal(def.id, "alice")
    assert.ok("name" in def)
    assert.ok("ko" in def.name)
    assert.ok("en" in def.name)
  })

  it("canon new location creates JSON file", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-new-loc-"))
    run(`node ${CLI} init ${tmp}`)
    run(`node ${CLI} new location seoul -d ${tmp}`)

    const locPath = join(tmp, "canon", "worldbuilding", "locations", "seoul.json")
    assert.ok(existsSync(locPath))
    const loc = JSON.parse(readFileSync(locPath, "utf-8"))
    assert.equal(loc.id, "seoul")
  })
})

// ── canon lock ──

describe("canon lock", () => {
  it("generates valid v2 lock structure", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-lock-struct-"))
    run(`node ${CLI} init ${tmp}`)
    run(`node ${CLI} new character alice -d ${tmp}`)
    run(`node ${CLI} new story ep01 -d ${tmp}`)

    // git init + commit so lock can get HEAD
    run("git init", { cwd: tmp })
    run("git add -A", { cwd: tmp })
    run('git commit -m "init" --no-gpg-sign', { cwd: tmp })

    run(`node ${CLI} lock ${tmp}`)

    const lockPath = join(tmp, "canon.lock.json")
    assert.ok(existsSync(lockPath))
    const lock = JSON.parse(readFileSync(lockPath, "utf-8"))
    assert.equal(lock.schema_version, "canon.lock.v2")
    assert.equal(lock.hash_algo, "sha256")
    assert.ok(/^[0-9a-f]{64}$/.test(lock.worldbuilding_hash), "hash should be 64-char hex")
    assert.ok(/^[0-9a-f]{40}$/.test(lock.canon_commit), "canon_commit should be 40-char SHA")
    assert.ok(Array.isArray(lock.contributors))
    assert.ok(typeof lock.generated_at === "string")
  })

  it("refuses lock when compliance fails", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-lock-refuse-"))
    run(`node ${CLI} init ${tmp}`)
    run(`node ${CLI} new character alice -d ${tmp}`)
    run(`node ${CLI} new story ep01 -d ${tmp}`)

    // git init + commit
    run("git init", { cwd: tmp })
    run("git add -A", { cwd: tmp })
    run('git commit -m "init" --no-gpg-sign', { cwd: tmp })

    // genesis lock (no existing lock → skips compliance)
    run(`node ${CLI} lock ${tmp}`)

    // Now metadata has canon_ref="" which mismatches lock → compliance fails
    // Second lock should refuse
    const result = tryRun(`node ${CLI} lock ${tmp}`)
    assert.equal(result.code, 1)
    assert.ok(result.stderr.includes("compliance check failed"))
  })
})

// ── Full lifecycle ──

describe("full lifecycle", () => {
  it("init → new → lock → check = exit 0", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-lifecycle-"))

    // 1. init
    run(`node ${CLI} init ${tmp}`)

    // 2. create entities
    run(`node ${CLI} new character alice -d ${tmp}`)
    run(`node ${CLI} new location seoul -d ${tmp}`)
    run(`node ${CLI} new story ep01 -d ${tmp}`)

    // 3. git init + commit
    run("git init", { cwd: tmp })
    run("git add -A", { cwd: tmp })
    run('git commit -m "init" --no-gpg-sign', { cwd: tmp })

    // 4. genesis lock
    run(`node ${CLI} lock ${tmp}`)

    // 5. read lock commit, update metadata
    const lock = JSON.parse(readFileSync(join(tmp, "canon.lock.json"), "utf-8"))
    const metaPath = join(tmp, "stories", "ep01", "metadata.json")
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"))
    meta.canon_ref = lock.canon_commit
    meta.characters = ["alice"]
    meta.locations = ["seoul"]
    meta.episode = 1
    meta.title = { ko: "테스트", en: "Test" }
    meta.synopsis = { ko: "테스트 시놉시스", en: "Test synopsis" }
    meta.contributor = "tester"
    meta.canon_status = "canonical"
    meta.timeline = "2025-03-15"
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n")

    // 6. check should pass
    const result = tryRun(`node ${CLI} check ${tmp}`)
    assert.equal(result.code, 0, `check should pass, stderr: ${result.stderr}`)
  })
})

// ── Multi-story ──

describe("multi-story check", () => {
  it("reports mixed pass/fail across stories", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-multi-"))
    run(`node ${CLI} init ${tmp}`)
    run(`node ${CLI} new character alice -d ${tmp}`)
    run(`node ${CLI} new location seoul -d ${tmp}`)

    // git init + commit + lock
    run("git init", { cwd: tmp })
    mkdirSync(join(tmp, "stories", "ep01"), { recursive: true })
    mkdirSync(join(tmp, "stories", "ep02"), { recursive: true })
    run("git add -A", { cwd: tmp })
    run('git commit -m "init" --no-gpg-sign', { cwd: tmp })
    run(`node ${CLI} lock ${tmp}`)

    const lock = JSON.parse(readFileSync(join(tmp, "canon.lock.json"), "utf-8"))

    // ep01: valid
    writeFileSync(join(tmp, "stories", "ep01", "metadata.json"), JSON.stringify({
      schema_version: "1.2", canon_ref: lock.canon_commit, id: "ep01", episode: 1,
      title: { ko: "t", en: "t" }, timeline: "2025-01-01",
      synopsis: { ko: "s", en: "s" }, characters: ["alice"], locations: ["seoul"],
      contributor: "tester", canon_status: "canonical",
    }, null, 2) + "\n")

    // ep02: invalid canon_ref
    writeFileSync(join(tmp, "stories", "ep02", "metadata.json"), JSON.stringify({
      schema_version: "1.2", canon_ref: "wrong-ref", id: "ep02", episode: 2,
      title: { ko: "t", en: "t" }, timeline: "2025-02-01",
      synopsis: { ko: "s", en: "s" }, characters: ["alice"], locations: ["seoul"],
      contributor: "tester", canon_status: "canonical",
    }, null, 2) + "\n")

    const result = tryRun(`node ${CLI} check ${tmp}`)
    assert.equal(result.code, 1, "should exit 1 when any story fails")
    assert.ok(result.stdout.includes("ep01"), "should mention ep01")
    assert.ok(result.stdout.includes("ep02"), "should mention ep02")
  })
})

// ── Slug ≠ metadata.id enforcement ──

describe("slug vs metadata.id mismatch enforcement", () => {
  it("fails when directory slug differs from metadata.id", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-slug-enforce-"))
    run(`node ${CLI} init ${tmp}`)
    run(`node ${CLI} new character alice -d ${tmp}`)
    run(`node ${CLI} new location seoul -d ${tmp}`)
    run(`node ${CLI} new story ep01 -d ${tmp}`)

    // git init + commit + genesis lock
    run("git init", { cwd: tmp })
    run("git add -A", { cwd: tmp })
    run('git commit -m "init" --no-gpg-sign', { cwd: tmp })
    run(`node ${CLI} lock ${tmp}`)

    const lock = JSON.parse(readFileSync(join(tmp, "canon.lock.json"), "utf-8"))
    const metaPath = join(tmp, "stories", "ep01", "metadata.json")
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"))
    meta.canon_ref = lock.canon_commit
    meta.characters = ["alice"]
    meta.locations = ["seoul"]
    meta.episode = 1
    meta.title = { ko: "t", en: "t" }
    meta.synopsis = { ko: "s", en: "s" }
    meta.contributor = "tester"
    meta.canon_status = "canonical"
    meta.timeline = "2025-03-15"
    // Set metadata.id to something different from directory slug "ep01"
    meta.id = "episode-01"
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n")

    const result = tryRun(`node ${CLI} check ${tmp}`)
    const output = result.stdout + result.stderr
    assert.equal(result.code, 1, `check should fail, output: ${output}`)
    assert.ok(output.includes("metadata_schema_valid"), "should fail metadata_schema_valid check")
    assert.ok(output.includes("ep01"), "should mention directory slug")
    assert.ok(output.includes("episode-01"), "should mention metadata.id")
  })
})

// ── v1.3 E2E tests ──

describe("canon check default v1.2 regression", () => {
  it("default canon check outputs check.v2 for v1.2 repo", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-v12-check-"))
    run(`node ${CLI} init ${tmp}`)
    run(`node ${CLI} new character alice -d ${tmp}`)
    run(`node ${CLI} new story ep01 -d ${tmp}`)
    run("git init", { cwd: tmp })
    run("git add -A", { cwd: tmp })
    run('git commit -m "init" --no-gpg-sign', { cwd: tmp })
    run(`node ${CLI} lock ${tmp}`)

    const lock = JSON.parse(readFileSync(join(tmp, "canon.lock.json"), "utf-8"))
    const metaPath = join(tmp, "stories", "ep01", "metadata.json")
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"))
    meta.canon_ref = lock.canon_commit
    meta.characters = ["alice"]
    meta.episode = 1
    meta.title = { ko: "t", en: "t" }
    meta.synopsis = { ko: "s", en: "s" }
    meta.contributor = "tester"
    meta.canon_status = "canonical"
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n")

    const result = tryRun(`node ${CLI} check ${tmp}`)
    assert.equal(result.code, 0, `v1.2 check should pass, stderr: ${result.stderr}`)
    assert.ok(result.stdout.includes("1/1 stories passing"))
  })
})

describe("canon check --schema v1.3", () => {
  it("outputs check.v3 for v1.3 repo", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-v13-check-"))
    run(`node ${CLI} init ${tmp}`)
    mkdirSync(join(tmp, "stories", "ep01"), { recursive: true })
    writeFileSync(join(tmp, "stories", "ep01", "metadata.json"), JSON.stringify({
      schema_version: "1.3",
      canon_ref: "",
      id: "ep01",
      episode: 1,
      lang: "ko",
      title: "테스트",
      timeline: "2025-01-01",
      synopsis: "시놉시스",
      characters: [],
      locations: [],
      contributor: "tester",
      canon_status: "canonical",
    }, null, 2) + "\n")

    const result = tryRun(`node ${CLI} check ${tmp} --schema v1.3`)
    // Should run with 8 checks (derived_from_valid included)
    assert.ok(result.stdout.includes("derived_from_valid"), "should show derived_from_valid check")
    assert.ok(result.stdout.includes("ep01"), "should show story id")
  })
})

describe("canon check fail-closed on v1.3 without flag", () => {
  it("errors when v1.3 metadata found without --schema flag", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-v13-failclosed-"))
    run(`node ${CLI} init ${tmp}`)
    mkdirSync(join(tmp, "stories", "ep01"), { recursive: true })
    writeFileSync(join(tmp, "stories", "ep01", "metadata.json"), JSON.stringify({
      schema_version: "1.3",
      id: "ep01",
      lang: "ko",
      title: "test",
    }, null, 2) + "\n")

    const result = tryRun(`node ${CLI} check ${tmp}`)
    assert.equal(result.code, 1)
    assert.ok(result.stderr.includes("v1.3 metadata detected"), `should mention v1.3 detected, got: ${result.stderr}`)
    assert.ok(result.stderr.includes("--schema v1.3"), "should suggest --schema flag")
  })
})

describe("canon lock v1.3 explicit error", () => {
  it("errors when v1.3 metadata found in lock command", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-v13-lock-"))
    run(`node ${CLI} init ${tmp}`)
    mkdirSync(join(tmp, "stories", "ep01"), { recursive: true })
    writeFileSync(join(tmp, "stories", "ep01", "metadata.json"), JSON.stringify({
      schema_version: "1.3",
      id: "ep01",
      lang: "ko",
      title: "test",
    }, null, 2) + "\n")
    run("git init", { cwd: tmp })
    run("git add -A", { cwd: tmp })
    run('git commit -m "init" --no-gpg-sign', { cwd: tmp })

    const result = tryRun(`node ${CLI} lock ${tmp}`)
    assert.equal(result.code, 1)
    assert.ok(result.stderr.includes("v1.3 metadata detected"), `should mention v1.3 detected, got: ${result.stderr}`)
    assert.ok(result.stderr.includes("not yet supported"), "should say not yet supported")
  })
})

describe("canon migrate", () => {
  function setupV12Repo(): string {
    const tmp = mkdtempSync(join(tmpdir(), "canon-migrate-"))
    mkdirSync(join(tmp, "stories", "ep01"), { recursive: true })
    mkdirSync(join(tmp, "stories", "ep02"), { recursive: true })
    writeFileSync(join(tmp, ".canonrc.json"), JSON.stringify({
      schema_version: "canonrc.v1",
      author: "tester",
      default_lang: "ko",
    }, null, 2) + "\n")
    writeFileSync(join(tmp, "stories", "ep01", "metadata.json"), JSON.stringify({
      schema_version: "1.2",
      canon_ref: "abc",
      id: "ep01",
      episode: 1,
      title: { ko: "제목1", en: "Title1" },
      timeline: "2025-01-01",
      synopsis: { ko: "개요1", en: "Synopsis1" },
      characters: [],
      locations: [],
      contributor: "tester",
      canon_status: "canonical",
    }, null, 2) + "\n")
    writeFileSync(join(tmp, "stories", "ep02", "metadata.json"), JSON.stringify({
      schema_version: "1.2",
      canon_ref: "abc",
      id: "ep02",
      episode: 2,
      title: { ko: "제목2", en: "Title2" },
      timeline: "2025-02-01",
      synopsis: { ko: "개요2", en: "Synopsis2" },
      characters: [],
      locations: [],
      contributor: "writer",
      canon_status: "canonical",
    }, null, 2) + "\n")
    return tmp
  }

  it("dry-run does not modify files", () => {
    const tmp = setupV12Repo()
    const before = readFileSync(join(tmp, "stories", "ep01", "metadata.json"), "utf-8")

    const result = tryRun(`node ${CLI} migrate ${tmp}`)
    assert.equal(result.code, 0)
    assert.ok(result.stdout.includes("DRY RUN"), "should say dry run")
    assert.ok(result.stdout.includes("WOULD"), "should show WOULD for each story")

    const after = readFileSync(join(tmp, "stories", "ep01", "metadata.json"), "utf-8")
    assert.equal(before, after, "file should not be modified")
    assert.ok(!existsSync(join(tmp, "stories", "ep01", "metadata.json.v12.bak")), "no backup in dry-run")
  })

  it("--apply creates backup and migrates to v1.3", () => {
    const tmp = setupV12Repo()

    const result = tryRun(`node ${CLI} migrate ${tmp} --apply`)
    assert.equal(result.code, 0)
    assert.ok(result.stdout.includes("DONE"), "should show DONE")

    // Check backup exists
    assert.ok(existsSync(join(tmp, "stories", "ep01", "metadata.json.v12.bak")), "backup should exist")
    assert.ok(existsSync(join(tmp, "stories", "ep02", "metadata.json.v12.bak")), "backup should exist")

    // Check migrated metadata
    const meta1 = JSON.parse(readFileSync(join(tmp, "stories", "ep01", "metadata.json"), "utf-8"))
    assert.equal(meta1.schema_version, "1.3")
    assert.equal(meta1.lang, "ko")
    assert.equal(typeof meta1.title, "string")
    assert.equal(meta1.title, "제목1")

    const meta2 = JSON.parse(readFileSync(join(tmp, "stories", "ep02", "metadata.json"), "utf-8"))
    assert.equal(meta2.schema_version, "1.3")
    assert.equal(meta2.title, "제목2")
  })

  it("idempotent — second run skips already v1.3", () => {
    const tmp = setupV12Repo()

    run(`node ${CLI} migrate ${tmp} --apply`)
    const afterFirst = readFileSync(join(tmp, "stories", "ep01", "metadata.json"), "utf-8")

    const result = tryRun(`node ${CLI} migrate ${tmp} --apply`)
    assert.equal(result.code, 0)
    assert.ok(result.stdout.includes("SKIP"), "should skip already v1.3")

    const afterSecond = readFileSync(join(tmp, "stories", "ep01", "metadata.json"), "utf-8")
    assert.equal(afterFirst, afterSecond, "file should not change on second run")
  })

  it("requires --lang or .canonrc.json default_lang", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-migrate-nolang-"))
    mkdirSync(join(tmp, "stories", "ep01"), { recursive: true })
    writeFileSync(join(tmp, "stories", "ep01", "metadata.json"), JSON.stringify({
      schema_version: "1.2", id: "ep01",
    }, null, 2) + "\n")

    const result = tryRun(`node ${CLI} migrate ${tmp} --apply`)
    assert.equal(result.code, 1)
    assert.ok(result.stderr.includes("--lang"), "should mention --lang flag")
  })

  it("rejects unsupported v1.1 metadata", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-migrate-v11-"))
    mkdirSync(join(tmp, "stories", "ep01"), { recursive: true })
    writeFileSync(join(tmp, ".canonrc.json"), JSON.stringify({
      schema_version: "canonrc.v1", author: "t", default_lang: "ko",
    }, null, 2) + "\n")
    writeFileSync(join(tmp, "stories", "ep01", "metadata.json"), JSON.stringify({
      schema_version: "1.1", id: "ep01",
    }, null, 2) + "\n")

    const result = tryRun(`node ${CLI} migrate ${tmp} --apply`)
    assert.equal(result.code, 1)
    assert.ok(result.stdout.includes("unsupported") || result.stderr.includes("unsupported"),
      "should mention unsupported version")
  })
})
