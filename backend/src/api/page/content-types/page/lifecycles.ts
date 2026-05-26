import { notifyRevalidation } from "../../../../utils/revalidate";

function tagsForPage(event: any): string[] {
  const result = event?.result;
  const locale = typeof result?.locale === "string" ? result.locale.trim() : null;
  const documentId = typeof result?.documentId === "string" ? result.documentId.trim() : null;

  const tags: string[] = ["pages", "sitemap"];

  if (locale) {
    tags.push("locale:" + locale);
    tags.push("navigation:" + locale);
  }
  if (documentId) {
    tags.push("page:" + documentId);
  }

  return tags;
}

export default {
  async afterCreate(event: any) {
    await notifyRevalidation(tagsForPage(event));
  },
  async afterUpdate(event: any) {
    await notifyRevalidation(tagsForPage(event));
  },
  async afterDelete(event: any) {
    await notifyRevalidation(tagsForPage(event));
  },
};
