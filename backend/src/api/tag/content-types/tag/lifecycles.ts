import { notifyRevalidation } from "../../../../utils/revalidate";

function tagsForTag(event: any): string[] {
  const result = event?.result;
  const locale = typeof result?.locale === "string" ? result.locale.trim() : null;

  const tags: string[] = ["tags", "pages", "sitemap"];

  if (locale) {
    tags.push("locale:" + locale);
  }

  return tags;
}

export default {
  async afterCreate(event: any) {
    await notifyRevalidation(tagsForTag(event));
  },
  async afterUpdate(event: any) {
    await notifyRevalidation(tagsForTag(event));
  },
  async afterDelete(event: any) {
    await notifyRevalidation(tagsForTag(event));
  },
};
