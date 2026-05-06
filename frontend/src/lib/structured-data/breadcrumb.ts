export type BreadcrumbItem = {
  name: string;
  url: string;
};

export type BreadcrumbListLd = {
  "@context": string;
  "@type": string;
  itemListElement: Array<{
    "@type": string;
    position: number;
    name: string;
    item: string;
  }>;
};

/**
 * Builds a Schema.org `BreadcrumbList` from an ordered array of items.
 *
 * @param items - Ordered breadcrumb segments (home → parent → current page).
 * @returns A `BreadcrumbList` JSON-LD object, or `null` if no items.
 */
export function buildBreadcrumbLd(items: BreadcrumbItem[]): BreadcrumbListLd | null {
  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
