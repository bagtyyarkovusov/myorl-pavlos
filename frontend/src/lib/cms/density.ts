import type { LayoutVariant, PageType } from "./types";

export type Density = "scanning" | "focused" | "theater";

const SCANNING_LAYOUTS: ReadonlySet<LayoutVariant> = new Set([
  "section-index",
  "clinic-index",
  "video-index",
  "encyclopedia-index",
  "search-results",
  "sitemap",
]);

export function getDensityForPage(pageType: PageType, layoutVariant: LayoutVariant): Density {
  if (pageType === "home" || layoutVariant === "home") {
    return "theater";
  }

  if (pageType === "system" && SCANNING_LAYOUTS.has(layoutVariant)) {
    return "scanning";
  }

  return "focused";
}
