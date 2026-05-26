import { notifyRevalidation } from "../../../../utils/revalidate";

function tagsForGlobal(event: any): string[] {
  const result = event?.result;
  const locale = typeof result?.locale === "string" ? result.locale.trim() : null;

  const tags: string[] = ["pages", "sitemap"];

  if (locale) {
    tags.push("global:" + locale);
    tags.push("locale:" + locale);
  }

  return tags;
}

export default {
  async afterCreate(event: any) {
    await notifyRevalidation(tagsForGlobal(event));
  },
  async afterUpdate(event: any) {
    await notifyRevalidation(tagsForGlobal(event));
  },
  async afterDelete(event: any) {
    await notifyRevalidation(tagsForGlobal(event));
  },
};
