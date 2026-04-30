import type { Locale, MediaDTO, PageRefDTO } from "./common";
import type { SectionDTO, StrapiSectionRaw } from "./sections";
import type { SeoDTO, StrapiMedia, StrapiSeo } from "./seo";
import type { TagDTO, StrapiTag } from "./tag";

export type PageType =
  | "home"
  | "content"
  | "faq"
  | "accordion"
  | "tabs"
  | "gallery"
  | "contact"
  | "system";

export type LayoutVariant =
  | "home"
  | "standard"
  | "service-article"
  | "service-faq"
  | "service-accordion"
  | "service-tabs"
  | "clinic-gallery"
  | "office-gallery"
  | "encyclopedia-article"
  | "section-index"
  | "clinic-index"
  | "video-index"
  | "encyclopedia-index"
  | "appointment-form"
  | "not-found"
  | "search-results"
  | "sitemap"
  | "specialized-article"
  | "contact";

export type RenderMode = "cms" | "frontend-native";

export type PageDTO = {
  documentId: string;
  locale: Locale;
  slug: string;
  title: string;
  menuTitle?: string | null;
  navLabel: string;
  pageType: PageType;
  layoutVariant: LayoutVariant;
  renderMode: RenderMode;
  seo: SeoDTO;
  seoTitle: string;
  content?: string | null;
  excerpt?: string | null;
  featuredImage?: MediaDTO | null;
  imageCenter?: MediaDTO | null;
  externalUrl?: string | null;
  isFolder: boolean;
  hideFromMenu: boolean;
  menuIndex: number;
  parentPage?: PageRefDTO | null;
  tags: TagDTO[];
  infoBlockBottom?: string | null;
  articleAuthor?: string | null;
  sources?: string | null;
  popUpClose?: string | null;
  alternateUrls: Partial<Record<Locale, string>>;
  sections: SectionDTO[];
};

export interface NavigationInput {
  documentId: string;
  locale: Locale;
  slug: string;
  title: string;
  menuTitle?: string | null;
  navLabel: string;
  menuIndex: number;
  hideFromMenu: boolean;
  parentPage?: PageRefDTO | null;
  externalUrl?: string | null;
  isFolder: boolean;
  excerpt?: string | null;
}

export type NavigationNodeDTO = NavigationInput & {
  href: string;
  children: NavigationNodeDTO[];
};

export type StrapiSingleResponse<T> = {
  data: T | null;
  meta?: unknown;
};

export type StrapiListResponse<T> = {
  data: T[];
  meta?: unknown;
};

export type StrapiPageRef = {
  documentId?: string | null;
  locale?: Locale | string | null;
  slug?: string | null;
  title?: string | null;
};

export type StrapiLocalization = {
  documentId?: string | null;
  locale?: Locale | string | null;
  slug?: string | null;
  title?: string | null;
};

export type StrapiPagePayload = {
  id?: number;
  documentId: string;
  locale: Locale;
  slug: string;
  title: string;
  menuTitle?: string | null;
  pageType: PageType;
  layoutVariant: LayoutVariant;
  seo?: StrapiSeo | null;
  content?: string | null;
  excerpt?: string | null;
  featuredImage?: StrapiMedia | null;
  imageCenter?: StrapiMedia | null;
  externalUrl?: string | null;
  isFolder?: boolean | null;
  hideFromMenu?: boolean | null;
  menuIndex?: number | null;
  parentPage?: StrapiPageRef | null;
  tags?: StrapiTag[] | null;
  infoBlockBottom?: string | null;
  articleAuthor?: string | null;
  sources?: string | null;
  popUpClose?: string | null;
  pageSections?: StrapiSectionRaw[] | null;
  localizations?: StrapiLocalization[] | null;
  legacySourceResourceId?: unknown;
  relatedPages?: unknown;
  childrenPages?: unknown;
};
