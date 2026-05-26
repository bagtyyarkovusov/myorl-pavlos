import { createLifecycleHandlers } from "../../../../utils/revalidate";

function tagsForVideoEntry(event: any): string[] {
  const result = event?.result;
  const locale = typeof result?.locale === "string" ? result.locale.trim() : null;
  const documentId = typeof result?.documentId === "string" ? result.documentId.trim() : null;

  const tags: string[] = ["pages", "sitemap"];

  if (locale) {
    tags.push("locale:" + locale);
  }
  if (documentId) {
    tags.push("video:" + documentId);
  }

  return tags;
}

export default createLifecycleHandlers(tagsForVideoEntry);
