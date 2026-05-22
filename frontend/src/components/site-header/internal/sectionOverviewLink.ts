import { hrefForLocaleSlug } from "@/lib/cms/navigation";
import type { NavigationNodeDTO } from "@/lib/cms/types";

/** Hide "open section" when the parent item already routes to the locale homepage. */
export function showsSectionOverviewLink(item: NavigationNodeDTO): boolean {
  return item.href !== hrefForLocaleSlug(item.locale, "index");
}
