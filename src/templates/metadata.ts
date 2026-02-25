export interface MetadataOptions {
  contributor?: string
  episode?: number
  titleKo?: string
  titleEn?: string
  timeline?: string
  synopsisKo?: string
  synopsisEn?: string
  characters?: string[]
  locations?: string[]
  canonStatus?: "canonical" | "non-canonical"
}

export function metadataTemplate(id: string, contributorOrOpts: string | MetadataOptions = ""): string {
  const opts: MetadataOptions = typeof contributorOrOpts === "string"
    ? { contributor: contributorOrOpts }
    : contributorOrOpts

  return JSON.stringify({
    schema_version: "1.2",
    canon_ref: "",
    id,
    episode: opts.episode ?? 0,
    title: { ko: opts.titleKo ?? "", en: opts.titleEn ?? "" },
    timeline: opts.timeline ?? "2025-01-01",
    synopsis: { ko: opts.synopsisKo ?? "", en: opts.synopsisEn ?? "" },
    characters: opts.characters ?? [],
    locations: opts.locations ?? [],
    contributor: opts.contributor ?? "",
    canon_status: opts.canonStatus ?? "non-canonical",
  }, null, 2) + "\n"
}
