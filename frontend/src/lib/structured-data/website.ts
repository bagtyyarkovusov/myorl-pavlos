export type WebSiteLd = {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  potentialAction?: {
    "@type": string;
    target: {
      "@type": string;
      urlTemplate: string;
    };
    "query-input": string;
  };
};

/**
 * Builds a Schema.org `WebSite` JSON-LD object.
 *
 * Includes a `SearchAction` so Google can display a sitelinks searchbox.
 *
 * @param siteUrl - The canonical site URL.
 * @param name - The site name.
 * @returns A `WebSite` JSON-LD object.
 */
export function buildWebSiteLd(siteUrl: string, name: string): WebSiteLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search-results?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
