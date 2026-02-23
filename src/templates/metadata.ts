export function metadataTemplate(id: string, contributor = ""): string {
  return JSON.stringify({
    schema_version: "1.2",
    canon_ref: "",
    id,
    episode: 0,
    title: { ko: "", en: "" },
    timeline: "2025-01-01",
    synopsis: { ko: "", en: "" },
    characters: [],
    locations: [],
    contributor,
    canon_status: "non-canonical",
  }, null, 2) + "\n"
}
