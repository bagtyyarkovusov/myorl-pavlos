import type {
  PageType,
  LayoutVariant,
  RenderMode,
  FooterCategory,
  DisclaimerOverride,
} from "@myorl-pavlos/shared-types";
import type { Locale, MediaDTO, PageRefDTO } from "./common";
import type { SectionDTO, StrapiSectionRaw } from "./sections";
import type { SeoDTO, StrapiMedia, StrapiSeo } from "./seo";
import type { TagDTO, StrapiTag } from "./tag";

export type { PageType, LayoutVariant, RenderMode, FooterCategory, DisclaimerOverride };

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
  footerCategory?: FooterCategory;
  parentPage?: PageRefDTO | null;
  /** Editor-managed cross-links from Strapi `relatedPages`. */
  relatedPages: PageRefDTO[];
  /** Resolved reader-facing Related Topics (manual or auto-suggested). */
  relatedTopics: PageRefDTO[];
  tags: TagDTO[];
  infoBlockBottom?: string | null;
  articleAuthor?: string | null;
  sources?: string | null;
  popUpClose?: string | null;
  disclaimerOverride: DisclaimerOverride;
  publishedAt?: string | null;
  updatedAt?: string | null;
  medicallyReviewedBy?: string | null;
  lastReviewedDate?: string | null;
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
  layoutVariant: LayoutVariant;
  excerpt?: string | null;
  featuredImage?: MediaDTO | null;
  imageCenter?: MediaDTO | null;
  seo?: SeoDTO | null;
  footerCategory?: FooterCategory;
  /** Tags for directory filtering (MODX-style hubs); empty when none assigned in CMS. */
  tags: TagDTO[];
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
  featuredImage?: StrapiMedia | null;
  imageCenter?: StrapiMedia | null;
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
  footerCategory?: FooterCategory | null;
  parentPage?: StrapiPageRef | null;
  tags?: StrapiTag[] | null;
  infoBlockBottom?: string | null;
  articleAuthor?: string | null;
  sources?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  medicallyReviewedBy?: string | null;
  lastReviewedDate?: string | null;
  popUpClose?: string | null;
  disclaimerOverride?: string | null;
  pageSections?: StrapiSectionRaw[] | null;
  localizations?: StrapiLocalization[] | null;
  legacySourceResourceId?: unknown;
  relatedPages?: StrapiPageRef[] | null;
  childrenPages?: unknown;
};
