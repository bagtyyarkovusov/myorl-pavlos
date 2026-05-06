/**
 * Standalone example of the myORL PageDTO and related types.
 *
 * This file mirrors the actual types in frontend/src/lib/cms/types/ and the
 * normalizer in frontend/src/lib/cms/page-normalizer.ts. It is provided as a
 * quick reference for API consumers and integrators.
 *
 * For the canonical source of truth, see:
 *   - frontend/src/lib/cms/types/*.ts
 *   - frontend/src/lib/cms/page-normalizer.ts
 *   - docs/api-contract.md
 */

export type Locale = "el" | "ru";

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
  | "contact"
  | "testimonials-index";

export type RenderMode = "cms" | "frontend-native";

export type SocialPlatform = "facebook" | "google" | "instagram" | "youtube";

export type SeoDTO = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogImage?: MediaDTO | null;
  robotsNoindex?: boolean | null;
  robotsNofollow?: boolean | null;
  sitemapExclude?: boolean | null;
  sitemapPriority?: number | null;
  sitemapChangeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never"
    | null;
};

export type MediaDTO = {
  url: string;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
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

// ── Section item DTOs ────────────────────────────────────────────────────────

export type PromoSlideItemDTO = {
  title?: string | null;
  description?: string | null;
  targetPageExcerpt?: string | null;
  image?: MediaDTO | null;
  targetPage?: PageRefDTO | null;
  targetUrl?: string | null;
};

export type LinkedResourceItemDTO = {
  title?: string | null;
  description?: string | null;
  image?: MediaDTO | null;
  targetPage?: PageRefDTO | null;
  targetUrl?: string | null;
};

export type SocialLinkItemDTO = {
  name: string;
  url: string;
  icon?: string | null;
};

export type VideoItemDTO = {
  title?: string | null;
  videoMp4?: MediaDTO | null;
  videoWebm?: MediaDTO | null;
  thumbnail?: MediaDTO | null;
  videoTags?: string | null;
};

export type AdvantageItemDTO = {
  title?: string | null;
  description?: string | null;
  icon?: string | null;
};

export type AccordionItemDTO = {
  title?: string | null;
  content?: string | null;
};

export type FaqItemDTO = {
  question?: string | null;
  answer?: string | null;
};

export type TabItemDTO = {
  title?: string | null;
  content?: string | null;
  link?: string | null;
};

export type GalleryItemDTO = {
  caption?: string | null;
  image?: MediaDTO | null;
};

// ── SectionDTO discriminated union ───────────────────────────────────────────

export type SectionDTO =
  | {
      __component: "sections.promo-slider";
      heading?: string | null;
      intro?: string | null;
      slides: PromoSlideItemDTO[];
    }
  | {
      __component: "sections.linked-resources";
      heading?: string | null;
      intro?: string | null;
      items: LinkedResourceItemDTO[];
    }
  | {
      __component: "sections.social-links";
      heading?: string | null;
      intro?: string | null;
      links: SocialLinkItemDTO[];
    }
  | {
      __component: "sections.video";
      heading?: string | null;
      intro?: string | null;
      videos: VideoItemDTO[];
    }
  | {
      __component: "sections.advantages";
      heading?: string | null;
      intro?: string | null;
      items: AdvantageItemDTO[];
    }
  | {
      __component: "sections.accordion";
      heading?: string | null;
      intro?: string | null;
      items: AccordionItemDTO[];
    }
  | {
      __component: "sections.faq";
      heading?: string | null;
      intro?: string | null;
      items: FaqItemDTO[];
    }
  | {
      __component: "sections.tabs";
      heading?: string | null;
      intro?: string | null;
      items: TabItemDTO[];
    }
  | {
      __component: "sections.gallery";
      heading?: string | null;
      intro?: string | null;
      items: GalleryItemDTO[];
    }
  | {
      __component: "sections.contact";
      heading?: string | null;
      intro?: string | null;
      details: ContactDetailDTO[];
      clinics: ContactClinicDTO[];
    };

// ── PageDTO ──────────────────────────────────────────────────────────────────

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

// ── Navigation DTOs ──────────────────────────────────────────────────────────

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

// ── Global settings DTO ──────────────────────────────────────────────────────

export type GlobalSettingsDTO = {
  locale: Locale;
  address: string | null;
  phoneTel: string | null;
  phoneDisplay: string | null;
  hours: string | null;
};

// ── Error types ──────────────────────────────────────────────────────────────

export type CmsPageError =
  | { kind: "not_found"; locale: Locale; slug: string; message: string }
  | { kind: "network"; message: string; cause?: unknown }
  | { kind: "timeout"; message: string }
  | { kind: "server_error"; status: number; message: string }
  | {
      kind: "validation";
      issues?: { path: (string | number)[]; message: string }[];
      raw?: unknown;
      message: string;
    };

export type PageResult =
  | { ok: true; page: PageDTO }
  | { ok: false; error: CmsPageError };
