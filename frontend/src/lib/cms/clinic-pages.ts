import type { PageDTO } from "./types";

export const CLINIC_HUB_SLUG = "iatreio";

export const CLINIC_CHILD_SLUGS = ["iatreio-alexandras", "iatreio-koukaki"] as const;

export type ClinicChildSlug = (typeof CLINIC_CHILD_SLUGS)[number];

export function isClinicHubPage(page: Pick<PageDTO, "slug">): boolean {
  return page.slug === CLINIC_HUB_SLUG;
}

export function isClinicChildPage(page: Pick<PageDTO, "parentPage">): boolean {
  return page.parentPage?.slug === CLINIC_HUB_SLUG;
}

export function getGallerySection(page: PageDTO) {
  return page.sections.find(
    (
      section,
    ): section is Extract<PageDTO["sections"][number], { __component: "sections.gallery" }> =>
      section.__component === "sections.gallery",
  );
}
