export function conventionsTemplate(): string {
  return `# Canon Conventions

## Repository Structure

\`\`\`
canon/
  characters/       # One directory per character
    <id>/
      definition.json
  worldbuilding/
    locations/      # One JSON file per location
      <id>.json
stories/
  <slug>/
    metadata.json   # Required — canon compliance metadata
    chapter-01.md   # Story content (markdown)
canon.lock.json     # Generated — do not edit manually
CONVENTIONS.md      # This file
\`\`\`

## Metadata Schema (v1.2)

Every story directory must contain a \`metadata.json\` with these required fields:

| Field            | Type     | Description                          |
|------------------|----------|--------------------------------------|
| schema_version   | "1.2"    | Fixed schema version                 |
| canon_ref        | string   | Commit SHA from canon.lock.json      |
| id               | string   | Unique story identifier (slug)       |
| episode          | number   | Episode number                       |
| title            | {ko, en} | Bilingual title                      |
| timeline         | string   | ISO date (YYYY-MM-DD)                |
| synopsis         | {ko, en} | Bilingual synopsis                   |
| characters       | string[] | Character IDs used in this story     |
| locations        | string[] | Location IDs used in this story      |
| contributor      | string   | GitHub username (immutable)          |
| canon_status     | string   | "canonical" or "non-canonical"       |

## Compliance Checks

Run \`canon check\` to validate:
- **metadata_schema_valid** — all required fields present and correct types
- **characters_valid** — all referenced characters exist in canon/characters/
- **locations_valid** — all referenced locations exist in canon/worldbuilding/locations/
- **timeline_consistent** — timeline is a valid ISO date
- **continuity_valid** — temporal_context references point to existing episodes
- **canon_version_match** — canon_ref matches canon.lock.json commit
- **contributor_valid** — contributor field is present and non-empty
`
}
