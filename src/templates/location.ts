export function locationTemplate(id: string): string {
  return JSON.stringify({
    id,
    name: { ko: "", en: "" },
    description: { ko: "", en: "" },
  }, null, 2) + "\n"
}
