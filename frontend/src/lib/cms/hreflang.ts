export function addXDefault(languages: Record<string, string>): Record<string, string> {
  const xDefault = languages.el ?? languages.ru;
  if (xDefault) {
    if (!languages.el && languages.ru) {
      console.warn(
        "No EL alternate URL for x-default hreflang, falling back to RU",
      );
    }
    languages["x-default"] = xDefault;
  }
  return languages;
}
