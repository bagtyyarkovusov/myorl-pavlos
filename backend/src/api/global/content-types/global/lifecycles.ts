import { createLifecycleHandlers } from "../../../../utils/revalidate";

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

export default createLifecycleHandlers(tagsForGlobal);
