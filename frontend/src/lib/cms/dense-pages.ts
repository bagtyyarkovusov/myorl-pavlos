import type { PageDTO } from "./types";

export const BIOGRAPHY_SLUG = "viografiko";

export function isBiographyPage(page: Pick<PageDTO, "slug">): boolean {
  return page.slug === BIOGRAPHY_SLUG;
}
