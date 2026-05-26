import { createLifecycleHandlers } from "../../../../utils/revalidate";

function tagsForTag(event: any): string[] {
  const result = event?.result;
  const locale = typeof result?.locale === "string" ? result.locale.trim() : null;

  const tags: string[] = ["tags", "pages", "sitemap"];

  if (locale) {
    tags.push("locale:" + locale);
  }

  return tags;
}

export default createLifecycleHandlers(tagsForTag);
