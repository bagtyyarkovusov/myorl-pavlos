/**
 * Phase 2 deferred fields (editorial inputs):
 *   author (Person / Organization reference)
 */

export type ArticleInput = {
  title: string;
  pageUrl: string;
  description?: string;
  locale: string;
  datePublished?: string | null;
  dateModified?: string | null;
  reviewedBy?: string | null;
  lastReviewed?: string | null;
};

export type ArticleLd = {
  "@context": string;
  "@type": string;
  headline: string;
  url: string;
  description?: string;
  inLanguage: string;
  datePublished?: string;
  dateModified?: string;
  reviewedBy?: { "@type": "Person"; name: string };
  lastReviewed?: string;
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

  if (input.datePublished) {
    result.datePublished = input.datePublished;
  }

  if (input.dateModified) {
    result.dateModified = input.dateModified;
  }

  if (input.reviewedBy && input.lastReviewed) {
    result.reviewedBy = { "@type": "Person", name: input.reviewedBy };
    result.lastReviewed = input.lastReviewed;
  }

  return result;
}
