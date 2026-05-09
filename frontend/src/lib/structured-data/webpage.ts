import { hrefForPage } from "@/lib/cms/navigation";
import type { PageDTO } from "@/lib/cms/types";

export type WebPageLd = {
  "@context": string;
  "@type": string;
  name: string;
  description?: string;
  url: string;
  inLanguage: string;
};

/**
 * Builds a Schema.org `WebPage` JSON-LD object for a given page.
 *
 * Honors `page.seo.schemaType` when set, swapping the `@type` to a WebPage
 * subtype such as `MedicalWebPage`, `AboutPage`, `ContactPage`, or
 * `CollectionPage`. Defaults to `WebPage` when no override is provided.
 *
 * @param page - The current page DTO.
 * @param siteUrl - The canonical site URL.
 * @returns A `WebPage` JSON-LD object.
 */
export function buildWebPageLd(page: PageDTO, siteUrl: string): WebPageLd {
  const result: WebPageLd = {
    "@context": "https://schema.org",
    "@type": page.seo.schemaType ?? "WebPage",
    name: page.title,
    url: new URL(hrefForPage(page), siteUrl).toString(),
    inLanguage: page.locale,
  };

  if (page.seo.metaDescription) {
    result.description = page.seo.metaDescription;
  }

  return result;
}
