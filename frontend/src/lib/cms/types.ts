import type { SectionDTO, StrapiSectionRaw } from "./sections";

export type { SectionDTO } from "./sections";

export const LOCALES = ["el", "ru"] as const;

export type Locale = (typeof LOCALES)[number];

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

export type SocialPlatform = "facebook" | "google" | "instagram" | "youtube";
export type RenderMode = "cms" | "frontend-native";

export type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type MediaDTO = {
  url: string;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type SeoDTO = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogImage?: MediaDTO | null;
  robotsNoindex: boolean;
  robotsNofollow: boolean;
  sitemapExclude: boolean;
  sitemapPriority?: number | null;
  sitemapChangeFrequency?: SitemapChangeFrequency | null;
};

export type PageRefDTO = {
  documentId: string;
  slug?: string | null;
  title?: string | null;
};

export type TagDTO = {
  name: string;
  slug: string;
};

export type ContactDetailDTO = {
  type: string;
  valueHtml: string;
};

export type ContactClinicDTO = {
  name: string;
  addressHtml: string;
  phone?: string | null;
  email?: string | null;
};

export type SocialLinkDTO = {
  label: string;
  url: string;
  platform: SocialPlatform;
};

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
  contact?: {
    details: ContactDetailDTO[];
    clinics: ContactClinicDTO[];
  };
};

export type GlobalSettingsDTO = {
  locale: Locale;
  address: string | null;
  phoneTel: string | null;
  phoneDisplay: string | null;
  hours: string | null;
};

export type StrapiGlobalPayload = {
  id?: number;
  documentId?: string;
  locale?: Locale | string | null;
  address?: string | null;
  phoneTel?: string | null;
  phoneDisplay?: string | null;
  hours?: string | null;
};

export type StrapiSingleResponse<T> = {
  data: T | null;
  meta?: unknown;
};

export type NavigationInput = Pick<
  PageDTO,
  | "documentId"
  | "locale"
  | "slug"
  | "title"
  | "menuTitle"
  | "navLabel"
  | "menuIndex"
  | "hideFromMenu"
  | "parentPage"
  | "externalUrl"
  | "isFolder"
  | "excerpt"
>;

export type NavigationNodeDTO = NavigationInput & {
  href: string;
  children: NavigationNodeDTO[];
};

export type StrapiListResponse<T> = {
  data: T[];
  meta?: unknown;
};

export type StrapiMedia = {
  url?: string | null;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type StrapiSeo = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogImage?: StrapiMedia | null;
  robotsNoindex?: boolean | null;
  robotsNofollow?: boolean | null;
  sitemapExclude?: boolean | null;
  sitemapPriority?: number | string | null;
  sitemapChangeFrequency?: SitemapChangeFrequency | null;
};

export type StrapiTag = {
  name?: string | null;
  slug?: string | null;
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

export type StrapiSocialLink = {
  name?: string | null;
  url?: string | null;
};

export type StrapiContactDetail = {
  type?: string | null;
  value?: string | null;
};

export type StrapiClinic = {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  faqSection?: StrapiSectionRaw | null;
  accordionSection?: StrapiSectionRaw | null;
  tabsSection?: StrapiSectionRaw | null;
  gallerySection?: StrapiSectionRaw | null;
  contactSection?: {
    heading?: string | null;
    intro?: string | null;
    details?: StrapiContactDetail[] | null;
    clinics?: StrapiClinic[] | null;
  } | null;
  localizations?: StrapiLocalization[] | null;
  templateId?: unknown;
  pageBlocks?: unknown;
  legacySourceResourceId?: unknown;
  relatedPages?: unknown;
  childrenPages?: unknown;
};

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}
