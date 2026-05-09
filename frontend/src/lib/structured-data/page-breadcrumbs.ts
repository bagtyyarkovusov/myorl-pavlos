import { hrefForPage } from "@/lib/cms/navigation";
import { getSiteUrl } from "@/lib/cms/site-url";
import type { PageDTO } from "@/lib/cms/types";
import { buildBreadcrumbLd, type BreadcrumbListLd } from "./breadcrumb";

/**
 * Builds a `BreadcrumbList` JSON-LD object for a given page.
 *
 * The trail always starts with the home page, followed by the parent page
 * (when present), and ends with the current page.
 *
 * @param page - The current page DTO.
 * @param siteUrl - Canonical site origin (defaults to `getSiteUrl()` so legacy
 *   call sites keep working until they migrate to the composer).
 * @param homeLabel - Localised label for the home crumb (default: "Home").
 * @returns A `BreadcrumbList` JSON-LD object, or `null` for the home page.
 */
export function buildPageBreadcrumbLd(
  page: PageDTO,
  siteUrl: string = getSiteUrl(),
  homeLabel = "Home",
): BreadcrumbListLd | null {
  if (page.slug === "index") return null;

  const items: { name: string; url: string }[] = [
    {
      name: homeLabel,
      url: new URL(hrefForPage({ locale: page.locale, slug: "index" }), siteUrl).toString(),
    },
  ];

  if (page.parentPage?.slug) {
    items.push({
      name: page.parentPage.title ?? page.parentPage.slug,
      url: new URL(
        hrefForPage({
          locale: page.locale,
          slug: page.parentPage.slug,
          externalUrl: null,
        }),
        siteUrl,
      ).toString(),
    });
  }

  items.push({
    name: page.navLabel || page.title,
    url: new URL(hrefForPage(page), siteUrl).toString(),
  });

  return buildBreadcrumbLd(items);
}
