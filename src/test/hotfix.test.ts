import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { execSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { validateRepo } from "../core/validate.js"
import { buildRepoModel } from "../adapters/github.js"
import { checkTimeline } from "../core/validate.js"
import type { StoryMetadata, RepoModel, GitHubRepoInput } from "../core/types.js"

const CLI = join(import.meta.dirname, "..", "cli.js")

describe("hotfix regressions", () => {
  it("check exits 1 when 0 stories found", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-empty-"))
    mkdirSync(join(tmp, "stories"), { recursive: true })

    const result = (() => {
      try {
        execSync(`node ${CLI} check ${tmp}`, { encoding: "utf-8", stdio: "pipe" })
        return { code: 0 }
      } catch (e: any) {
        return { code: e.status, stderr: e.stderr }
      }
    })()

    assert.equal(result.code, 1)
  })

  it("github adapter parses canon/characters/alice.json blob", () => {
    const input: GitHubRepoInput = {
      tree: [
        { path: "canon/characters/alice.json", type: "blob", sha: "aaa" },
        { path: "canon/characters/bob", type: "tree", sha: "bbb" },
        { path: "canon/characters/index.json", type: "blob", sha: "ccc" },
        { path: "stories/ep01", type: "tree", sha: "ddd" },
      ],
      files: new Map([
        ["stories/ep01/metadata.json", JSON.stringify({
          schema_version: "1.2", canon_ref: "abc", id: "ep01", episode: 1,
          title: { ko: "t", en: "t" }, timeline: "2025-01-01",
          synopsis: { ko: "s", en: "s" }, characters: ["alice", "bob"],
          locations: [], contributor: "testuser", canon_status: "canonical",
        })],
      ]),
    }

    const model = buildRepoModel(input)
    assert.ok(model.characters.has("alice"), "alice.json blob should be parsed")
    assert.ok(model.characters.has("bob"), "bob/ dir should be parsed")
    assert.ok(!model.characters.has("index"), "index should be excluded")
  })

  it("timeline rejects 2025-02-30 and 2025-01-01junk", () => {
    const feb30 = checkTimeline({ timeline: "2025-02-30" } as StoryMetadata)
    assert.equal(feb30.pass, false, "2025-02-30 should fail")

    const junk = checkTimeline({ timeline: "2025-01-01junk" } as StoryMetadata)
    assert.equal(junk.pass, false, "2025-01-01junk should fail")

    const valid = checkTimeline({ timeline: "2025-03-15" } as StoryMetadata)
    assert.equal(valid.pass, true, "2025-03-15 should pass")
  })

  it("init creates .canonrc.json but not canon.lock.json", () => {
    const tmp = mkdtempSync(join(tmpdir(), "canon-init-"))
    execSync(`node ${CLI} init ${tmp}`, { encoding: "utf-8", stdio: "pipe" })

    assert.ok(existsSync(join(tmp, ".canonrc.json")), ".canonrc.json should exist")
    assert.ok(!existsSync(join(tmp, "canon.lock.json")), "canon.lock.json should NOT exist")

    const rc = JSON.parse(
      readFileSync(join(tmp, ".canonrc.json"), "utf-8")
    )
    assert.equal(rc.schema_version, "canonrc.v1")
  })
})
