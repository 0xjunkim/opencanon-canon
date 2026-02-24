import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  checkMetadataSchema,
  checkCharacters,
  checkLocations,
  checkContinuity,
} from "../core/validate.js"
import type { StoryMetadata } from "../core/types.js"

const validMeta: Record<string, unknown> = {
  schema_version: "1.2",
  canon_ref: "abc123",
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

// ── checkMetadataSchema type validation ──

describe("checkMetadataSchema type validation", () => {
  it("accepts valid metadata with all correct types", () => {
    const result = checkMetadataSchema(validMeta)
    assert.equal(result.pass, true)
  })

  it("rejects title as plain string", () => {
    const result = checkMetadataSchema({ ...validMeta, title: "just a string" })
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("title"))
  })

  it("rejects synopsis as plain string", () => {
    const result = checkMetadataSchema({ ...validMeta, synopsis: "just a string" })
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("synopsis"))
  })

  it("rejects title missing ko field", () => {
    const result = checkMetadataSchema({ ...validMeta, title: { en: "hello" } })
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("title"))
  })

  it("rejects characters array containing non-strings", () => {
    const result = checkMetadataSchema({ ...validMeta, characters: [1, 2, 3] })
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("characters array must contain only strings"))
  })

  it("rejects locations array containing non-strings", () => {
    const result = checkMetadataSchema({ ...validMeta, locations: [null, {}] })
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("locations array must contain only strings"))
  })

  it("rejects canon_ref as number", () => {
    const result = checkMetadataSchema({ ...validMeta, canon_ref: 123 })
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("canon_ref must be a string"))
  })

  it("rejects id as number", () => {
    const result = checkMetadataSchema({ ...validMeta, id: 42 })
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("id must be a string"))
  })

  it("rejects contributor as number", () => {
    const result = checkMetadataSchema({ ...validMeta, contributor: 0 })
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("contributor must be a string"))
  })

  it("rejects timeline as number", () => {
    const result = checkMetadataSchema({ ...validMeta, timeline: 20250101 })
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("timeline must be a string"))
  })

  it("rejects episode as NaN", () => {
    const result = checkMetadataSchema({ ...validMeta, episode: NaN })
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("episode"))
  })

  it("rejects episode as Infinity", () => {
    const result = checkMetadataSchema({ ...validMeta, episode: Infinity })
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("episode"))
  })
})

// ── checkMetadataSchema slug enforcement ──

describe("checkMetadataSchema slug enforcement", () => {
  it("passes when slug matches metadata.id", () => {
    const result = checkMetadataSchema(validMeta, "ep01")
    assert.equal(result.pass, true)
  })

  it("fails when slug differs from metadata.id", () => {
    const result = checkMetadataSchema(validMeta, "episode-01")
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("ep01"))
    assert.ok(result.message?.includes("episode-01"))
  })

  it("passes when slug is undefined (backwards compat)", () => {
    const result = checkMetadataSchema(validMeta)
    assert.equal(result.pass, true)
  })
})

// ── checkContinuity defensive coding ──

describe("checkContinuity defensive coding", () => {
  it("handles thematic_echoes as non-array gracefully", () => {
    const meta = {
      ...validMeta,
      temporal_context: { prev_episode: null, next_episode: null, thematic_echoes: "not-an-array" },
    } as unknown as StoryMetadata
    const result = checkContinuity(meta, new Set(["ep01"]))
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("thematic_echoes must be an array"))
  })

  it("fails when prev_episode does not exist", () => {
    const meta = {
      ...validMeta,
      temporal_context: { prev_episode: "ghost", next_episode: null },
    } as unknown as StoryMetadata
    const result = checkContinuity(meta, new Set(["ep01"]))
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes('prev_episode "ghost" not found'))
  })

  it("passes when all temporal_context refs exist", () => {
    const meta = {
      ...validMeta,
      temporal_context: { prev_episode: "ep01", next_episode: "ep03", thematic_echoes: ["ep01"] },
    } as unknown as StoryMetadata
    const result = checkContinuity(meta, new Set(["ep01", "ep02", "ep03"]))
    assert.equal(result.pass, true)
  })

  it("passes when temporal_context is absent", () => {
    const meta = { ...validMeta } as unknown as StoryMetadata
    const result = checkContinuity(meta, new Set(["ep01"]))
    assert.equal(result.pass, true)
  })
})

// ── checkCharacters / checkLocations cross-reference ──

describe("checkCharacters cross-reference", () => {
  it("passes when all characters exist in known set", () => {
    const meta = { ...validMeta, characters: ["alice", "bob"] } as unknown as StoryMetadata
    const result = checkCharacters(meta, new Set(["alice", "bob", "charlie"]))
    assert.equal(result.pass, true)
  })

  it("fails when character is missing from known set", () => {
    const meta = { ...validMeta, characters: ["alice", "unknown"] } as unknown as StoryMetadata
    const result = checkCharacters(meta, new Set(["alice"]))
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("unknown"))
  })
})

describe("checkLocations cross-reference", () => {
  it("passes when all locations exist in known set", () => {
    const meta = { ...validMeta, locations: ["seoul", "tokyo"] } as unknown as StoryMetadata
    const result = checkLocations(meta, new Set(["seoul", "tokyo", "paris"]))
    assert.equal(result.pass, true)
  })

  it("fails when location is missing from known set", () => {
    const meta = { ...validMeta, locations: ["seoul", "atlantis"] } as unknown as StoryMetadata
    const result = checkLocations(meta, new Set(["seoul"]))
    assert.equal(result.pass, false)
    assert.ok(result.message?.includes("atlantis"))
  })
})
