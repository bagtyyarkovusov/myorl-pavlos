import type { Locale, PageRefDTO } from "./common";

export type VideoCategoryDTO = {
  slug: string;
  label: string;
};

export type VideoEntryDTO = {
  documentId: string;
  locale: Locale;
  title: string;
  youtubeId: string;
  youtubeUrl: string | null;
  categories: VideoCategoryDTO[];
  sortOrder: number;
  relatedArticle: PageRefDTO | null;
  legacyArticleUrl: string | null;
};

export type StrapiVideoEntryPayload = {
  documentId: string;
  locale: Locale;
  title: string;
  youtubeId: string;
  youtubeUrl?: string | null;
  categories?: unknown;
  sortOrder?: number | null;
  relatedArticle?: {
    documentId?: string | null;
    locale?: Locale | string | null;
    slug?: string | null;
    title?: string | null;
  } | null;
  legacyArticleUrl?: string | null;
};
