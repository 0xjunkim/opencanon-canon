# ADR-001: Engine v2 Schema Boundary

Status: Accepted
Date: 2025-02-24

## Context

@opencanon/canon v0.2.0 defines the service contract consumed by opencanon.co (web)
and future z2a-instance-app-canon (L3 compliance checker).

z2a engine v2 is in progress and may introduce new schema versions, additional check
types, or modified carrier formats. The service track (web platform) must not be blocked
by engine v2 development.

## Decision

Freeze the v0.2.0 service contract. Engine v2 changes are isolated from the service
release track.

### Boundary rules

1. **v0.2.x patches:** Bug fixes only. No schema version changes.
2. **v0.3.0+:** May add NEW schema versions alongside frozen ones.
   The frozen versions (metadata "1.2", canon.lock.v2, check.v2) are never modified or removed.
   Per-episode canon_ref chains: v0.3.0+ candidate.
3. **Engine v2 types:** Live in a separate namespace or export path
   (e.g., `@opencanon/canon/v2` or a new package).
4. **z2a-instance-app-canon:** Consumes engine v2 types via its own adapter layer,
   NOT by modifying the frozen service contract.

### What this means for each repo

| Repo | Tracks service contract? | Tracks engine v2? |
|---|---|---|
| opencanon-canon | YES (frozen) | YES (additive only) |
| opencanon (web) | YES (consumer) | NO |
| z2a-instance-app-canon | NO (on hold) | YES (when ready) |

## Consequences

- opencanon.co can ship features without waiting for engine v2.
- Engine v2 schema changes cannot break the web platform.
- canon-seed migration (v1.1 to v1.2) is a z2a-instance-app-canon task, not a web task.
- Contract tests (`src/test/contract.test.ts`) serve as the regression gate for any change.
