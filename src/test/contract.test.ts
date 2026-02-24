import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { execSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  METADATA_VERSION,
  LOCK_VERSION,
  REPORT_VERSION,
  CHECK_IDS,
  SchemaVersionError,
  parseMetadata,
  parseCanonLock,
  assertReportVersion,
} from "../core/contract.js"
import { validateRepo } from "../core/validate.js"
import { loadRepoFromFs } from "../adapters/fs.js"
import { buildRepoModel } from "../adapters/github.js"
import type { GitHubRepoInput, RepoModel } from "../core/types.js"

const CLI = join(import.meta.dirname, "..", "cli.js")

// ── Group 1: Frozen Constants ──

describe("frozen constants", () => {
  it("METADATA_VERSION is 1.2", () => {
    assert.equal(METADATA_VERSION, "1.2")
  })

  it("LOCK_VERSION is canon.lock.v2", () => {
    assert.equal(LOCK_VERSION, "canon.lock.v2")
  })

  it("REPORT_VERSION is check.v2", () => {
    assert.equal(REPORT_VERSION, "check.v2")
  })

  it("CHECK_IDS has exactly 7 entries in frozen order", () => {
    assert.equal(CHECK_IDS.length, 7)
    assert.deepEqual([...CHECK_IDS], [
      "metadata_schema_valid",
      "characters_valid",
      "locations_valid",
      "timeline_consistent",
      "continuity_valid",
      "canon_version_match",
      "contributor_valid",
    ])
  })
})

// ── Group 2: parseMetadata ──

describe("parseMetadata", () => {
  const validMeta = {
    schema_version: "1.2",
    canon_ref: "abc",
    id: "ep01",
    episode: 1,
    title: { ko: "t", en: "t" },
    timeline: "2025-01-01",
    synopsis: { ko: "s", en: "s" },
    characters: [],
    locations: [],
    contributor: "tester",
    canon_status: "canonical",
  }

  it("accepts valid metadata with schema_version 1.2", () => {
    const result = parseMetadata(validMeta)
    assert.equal(result.meta.schema_version, "1.2")
    assert.equal(result.raw.schema_version, "1.2")
  })

  it("rejects schema_version 1.0", () => {
    assert.throws(
      () => parseMetadata({ ...validMeta, schema_version: "1.0" }),
      (err: unknown) => {
        assert.ok(err instanceof SchemaVersionError)
        assert.equal(err.expected, "1.2")
        assert.equal(err.actual, "1.0")
        return true
      },
    )
  })

  it("rejects missing schema_version", () => {
    const { schema_version: _, ...noVersion } = validMeta
    assert.throws(
      () => parseMetadata(noVersion),
      (err: unknown) => {
        assert.ok(err instanceof SchemaVersionError)
        assert.equal(err.actual, undefined)
        return true
      },
    )
  })

  it("rejects non-object input", () => {
    assert.throws(() => parseMetadata(null), SchemaVersionError)
    assert.throws(() => parseMetadata("string"), SchemaVersionError)
    assert.throws(() => parseMetadata([1, 2]), SchemaVersionError)
  })

  it("passes version-only object (gate only, not field validation)", () => {
    const result = parseMetadata({ schema_version: "1.2" })
    assert.equal(result.meta.schema_version, "1.2")
  })
})

// ── Group 3: parseCanonLock ──

describe("parseCanonLock", () => {
  const validLock = {
    schema_version: "canon.lock.v2",
    canon_commit: "abc123",
    worldbuilding_hash: "def456",
    hash_algo: "sha256",
    generated_at: "2025-01-01T00:00:00.000Z",
    contributors: [],
  }

  it("accepts valid lock with schema_version canon.lock.v2", () => {
    const result = parseCanonLock(validLock)
    assert.equal(result.schema_version, "canon.lock.v2")
  })

  it("rejects schema_version canon.lock.v1", () => {
    assert.throws(
      () => parseCanonLock({ ...validLock, schema_version: "canon.lock.v1" }),
      (err: unknown) => {
        assert.ok(err instanceof SchemaVersionError)
        assert.equal(err.expected, "canon.lock.v2")
        assert.equal(err.actual, "canon.lock.v1")
        return true
      },
    )
  })

  it("rejects non-object input", () => {
    assert.throws(() => parseCanonLock(null), SchemaVersionError)
    assert.throws(() => parseCanonLock(42), SchemaVersionError)
    assert.throws(() => parseCanonLock([1]), SchemaVersionError)
  })

  it("rejects empty object (missing schema_version)", () => {
    assert.throws(
      () => parseCanonLock({}),
      (err: unknown) => {
        assert.ok(err instanceof SchemaVersionError)
        assert.equal(err.actual, undefined)
        return true
      },
    )
  })
})

// ── Group 4: SchemaVersionError ──

describe("SchemaVersionError", () => {
  it("is an instance of Error", () => {
    const err = new SchemaVersionError("1.2", "1.0")
    assert.ok(err instanceof Error)
    assert.ok(err instanceof SchemaVersionError)
  })

  it("has correct expected, actual, and name properties", () => {
    const err = new SchemaVersionError("canon.lock.v2", undefined)
    assert.equal(err.expected, "canon.lock.v2")
    assert.equal(err.actual, undefined)
    assert.equal(err.name, "SchemaVersionError")
    assert.ok(err.message.includes("canon.lock.v2"))
  })
})

// ── Group 5: assertReportVersion ──

describe("assertReportVersion", () => {
  it("accepts report with schemaVersion check.v2", () => {
    assert.doesNotThrow(() => assertReportVersion({ schemaVersion: "check.v2" }))
  })

  it("rejects schemaVersion check.v1", () => {
    assert.throws(
      () => assertReportVersion({ schemaVersion: "check.v1" }),
      (err: unknown) => {
        assert.ok(err instanceof SchemaVersionError)
        assert.equal(err.expected, "check.v2")
        assert.equal(err.actual, "check.v1")
        return true
      },
    )
  })

  it("rejects non-object input", () => {
    assert.throws(() => assertReportVersion(null), SchemaVersionError)
    assert.throws(() => assertReportVersion("string"), SchemaVersionError)
    assert.throws(() => assertReportVersion([1, 2]), SchemaVersionError)
  })

  it("rejects missing schemaVersion", () => {
    assert.throws(
      () => assertReportVersion({}),
      (err: unknown) => {
        assert.ok(err instanceof SchemaVersionError)
        assert.equal(err.expected, "check.v2")
        assert.equal(err.actual, undefined)
        return true
      },
    )
  })
})

// ── Group 6: Adapter Integration ──

describe("adapter integration", () => {
  it("fs adapter rejects v1 lock file", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-v1lock-"))
    mkdirSync(join(tmp, "stories"), { recursive: true })
    writeFileSync(join(tmp, "canon.lock.json"), JSON.stringify({
      schema_version: "canon.lock.v1",
      canon_commit: "old",
    }))

    assert.throws(() => loadRepoFromFs(tmp), SchemaVersionError)
  })

  it("github adapter rejects metadata with version 2.0", () => {
    const input: GitHubRepoInput = {
      tree: [
        { path: "stories/ep01", type: "tree", sha: "aaa" },
      ],
      files: new Map([
        ["stories/ep01/metadata.json", JSON.stringify({
          schema_version: "2.0",
          id: "ep01",
        })],
      ]),
    }

    assert.throws(() => buildRepoModel(input), SchemaVersionError)
  })
})

// ── Group 6: validateStory short-circuit ──

describe("validateStory short-circuit", () => {
  it("does not crash when metadata has version 1.2 but missing fields", () => {
    const incompleteMeta = { schema_version: "1.2" }
    const model: RepoModel = {
      canonLock: null,
      characters: new Set(),
      locations: new Set(),
      episodes: new Set(["ep01"]),
      stories: new Map([
        ["ep01", { meta: incompleteMeta as any, raw: incompleteMeta as any }],
      ]),
    }

    const report = validateRepo(model)
    assert.equal(report.totalStories, 1)
    assert.equal(report.stories[0].checks.length, 7)
    assert.equal(report.stories[0].checks[0].id, "metadata_schema_valid")
    assert.equal(report.stories[0].checks[0].pass, false)
    assert.equal(report.stories[0].allPass, false)
    for (let i = 1; i < 7; i++) {
      assert.equal(report.stories[0].checks[i].pass, false, `check ${i} should be failed`)
    }
  })

  it("runs all 7 checks normally when metadata is valid", () => {
    const validMeta = {
      schema_version: "1.2", canon_ref: "abc", id: "ep01", episode: 1,
      title: { ko: "t", en: "t" }, timeline: "2025-01-01",
      synopsis: { ko: "s", en: "s" }, characters: [], locations: [],
      contributor: "tester", canon_status: "canonical",
    }
    const model: RepoModel = {
      canonLock: null,
      characters: new Set(),
      locations: new Set(),
      episodes: new Set(["ep01"]),
      stories: new Map([
        ["ep01", { meta: validMeta as any, raw: validMeta as any }],
      ]),
    }

    const report = validateRepo(model)
    assert.equal(report.stories[0].checks.length, 7)
    assert.equal(report.stories[0].checks[0].id, "metadata_schema_valid")
    assert.equal(report.stories[0].checks[0].pass, true)
  })
})

// ── Group 7: Command-level Regression ──

describe("command-level schema rejection", () => {
  it("canon check exits 1 with error message for v1 lock", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-cmd-check-"))
    mkdirSync(join(tmp, "stories"), { recursive: true })
    writeFileSync(join(tmp, "canon.lock.json"), JSON.stringify({
      schema_version: "canon.lock.v1",
      canon_commit: "old",
    }))

    const result = (() => {
      try {
        execSync(`node ${CLI} check ${tmp}`, { encoding: "utf-8", stdio: "pipe" })
        return { code: 0, stderr: "" }
      } catch (e: any) {
        return { code: e.status, stderr: e.stderr }
      }
    })()

    assert.equal(result.code, 1)
    assert.ok(result.stderr.includes("Expected schema version"), `stderr should contain SchemaVersionError message, got: ${result.stderr}`)
  })

  it("canon lock exits 1 with error message for v1 lock", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-cmd-lock-"))
    mkdirSync(join(tmp, "canon"), { recursive: true })
    mkdirSync(join(tmp, "stories"), { recursive: true })
    writeFileSync(join(tmp, "canon.lock.json"), JSON.stringify({
      schema_version: "canon.lock.v1",
      canon_commit: "old",
    }))

    const result = (() => {
      try {
        execSync(`node ${CLI} lock ${tmp}`, { encoding: "utf-8", stdio: "pipe" })
        return { code: 0, stderr: "" }
      } catch (e: any) {
        return { code: e.status, stderr: e.stderr }
      }
    })()

    assert.equal(result.code, 1)
    assert.ok(result.stderr.includes("failed to read repo"), `stderr should contain 'failed to read repo', got: ${result.stderr}`)
  })
})
