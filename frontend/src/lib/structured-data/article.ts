/**
 * Phase 2 deferred fields (editorial inputs):
 *   author (Person / Organization reference), datePublished, dateModified
 */

export type ArticleInput = {
  title: string;
  pageUrl: string;
  description?: string;
  locale: string;
};

export type ArticleLd = {
  "@context": string;
  "@type": string;
  headline: string;
  url: string;
  description?: string;
  inLanguage: string;
};

export function buildArticleLd(input: ArticleInput): ArticleLd {
  const result: ArticleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    url: input.pageUrl,
    inLanguage: input.locale,
  };

  if (input.description) {
    result.description = input.description;
  }

  return result;
}
