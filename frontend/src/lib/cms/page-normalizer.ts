import { z } from "zod";
import { getCmsConfig } from "./env";
import type { CmsConfig } from "./env";
import { isLocale } from "./types";
import type {
  ContactClinicDTO,
  LayoutVariant,
  Locale,
  MediaDTO,
  PageDTO,
  PageRefDTO,
  SectionDTO,
  SeoDTO,
  StrapiClinic,
  StrapiContactDetail,
  StrapiLocalization,
  StrapiMedia,
  StrapiPagePayload,
  StrapiPageRef,
  StrapiSeo,
  StrapiTag,
  TagDTO,
} from "./types";
import type {
  AccordionItemDTO,
  AdvantageItemDTO,
  FaqItemDTO,
  GalleryItemDTO,
  LinkedResourceItemDTO,
  PromoSlideItemDTO,
  SectionComponent,
  SocialLinkItemDTO,
  StrapiSectionRaw,
  TabItemDTO,
  VideoItemDTO,
} from "./types/sections";

export const PAGE_POPULATE = {
  seo: { populate: ["ogImage"] },
  parentPage: { fields: ["documentId", "slug", "title"] },
  localizations: { fields: ["documentId", "locale", "slug", "title"] },
  tags: { fields: ["name", "slug"] },
  featuredImage: true,
  imageCenter: true,
  pageSections: {
    on: {
      "sections.promo-slider": {
        populate: {
          slides: { populate: ["image", "targetPage"] },
        },
      },
      "sections.linked-resources": {
        populate: {
          items: { populate: ["targetPage"] },
        },
      },
      "sections.social-links": {
        populate: { links: true },
      },
      "sections.video": {
        populate: {
          videos: { populate: ["thumbnail", "videoMp4", "videoWebm"] },
        },
      },
      "sections.advantages": {
        populate: { items: true },
      },
      "sections.accordion": {
        populate: { items: true },
      },
      "sections.faq": {
        populate: { items: true },
      },
      "sections.tabs": {
        populate: { items: true },
      },
      "sections.gallery": {
        populate: { items: { populate: ["image"] } },
      },
      "sections.contact": {
        populate: { details: true, clinics: true },
      },
    },
  },
} as const;

export const NAVIGATION_POPULATE = {
  parentPage: { fields: ["documentId", "slug", "title"] },
} as const;

export const SITEMAP_POPULATE = {
  seo: { populate: ["ogImage"] },
  parentPage: { fields: ["documentId", "slug", "title"] },
  localizations: { fields: ["documentId", "locale", "slug", "title"] },
} as const;

export function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized ? normalized : null;
}

export function optionalString(value: unknown): string | null {
  return typeof value === "string" ? normalizeOptionalText(value) : null;
}

export function toMediaDTO(
  media: StrapiMedia | null | undefined,
  strapiUrl?: string,
): MediaDTO | null {
  if (!media?.url) return null;
  return {
    url: resolveMediaUrl(media.url, strapiUrl),
    alternativeText: media.alternativeText ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
  };
}

function resolveMediaUrl(url: string, strapiUrl?: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = strapiUrl ?? getCmsConfig().strapiUrl;
  return new URL(url, base).toString();
}

export function toPageRefDTO(ref: StrapiPageRef | null | undefined): PageRefDTO | null {
  if (!ref?.documentId) return null;
  return {
    documentId: ref.documentId,
    slug: ref.slug ?? null,
    title: ref.title ?? null,
  };
}

export function toTagDTO(tag: StrapiTag | null | undefined): TagDTO | null {
  const name = normalizeOptionalText(tag?.name);
  const slug = normalizeOptionalText(tag?.slug);
  if (!name || !slug) return null;
  return { name, slug };
}

export function toSeoDTO(seo: StrapiSeo | null | undefined): SeoDTO {
  return {
    metaTitle: seo?.metaTitle ?? null,
    metaDescription: seo?.metaDescription ?? null,
    canonicalUrl: seo?.canonicalUrl ?? null,
    ogImage: toMediaDTO(seo?.ogImage),
    robotsNoindex: Boolean(seo?.robotsNoindex),
    robotsNofollow: Boolean(seo?.robotsNofollow),
    sitemapExclude: Boolean(seo?.sitemapExclude),
    sitemapPriority: normalizePriority(seo?.sitemapPriority),
    sitemapChangeFrequency: seo?.sitemapChangeFrequency ?? null,
  };
}

export function deriveSeoTitle(page: Pick<StrapiPagePayload, "title" | "seo">): string {
  return normalizeOptionalText(page.seo?.metaTitle) ?? page.title;
}

function normalizePriority(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const priority = Number(value);
  if (!Number.isFinite(priority)) return null;
  return Math.min(1, Math.max(0, priority));
}

function hrefForLocaleSlug(locale: Locale, slug: string): string {
  return slug === "index" ? `/${locale}` : `/${locale}/${slug}`;
}

function buildAlternateUrls(
  page: {
    locale: Locale;
    slug: string;
    localizations?: StrapiLocalization[] | null;
  },
  siteUrl?: string,
): Partial<Record<Locale, string>> {
  const resolve = (locale: Locale, slug: string): string => {
    const path = hrefForLocaleSlug(locale, slug);
    if (siteUrl) {
      return new URL(path, siteUrl).toString();
    }
    return path;
  };

  const urlByLocale = new Map<Locale, string>();
  urlByLocale.set(page.locale, resolve(page.locale, page.slug));

  for (const localization of page.localizations ?? []) {
    const locale = localization.locale;
    const slug = localization.slug;
    if (locale && isLocale(locale) && slug) {
      urlByLocale.set(locale, resolve(locale, slug));
    }
  }

  return Object.fromEntries(urlByLocale) as Partial<Record<Locale, string>>;
}

const KNOWN_SECTION_COMPONENTS: ReadonlySet<SectionComponent> = new Set<SectionComponent>([
  "sections.promo-slider",
  "sections.linked-resources",
  "sections.social-links",
  "sections.video",
  "sections.advantages",
  "sections.accordion",
  "sections.faq",
  "sections.tabs",
  "sections.gallery",
  "sections.contact",
]);

export function toSemanticSections(page: StrapiPagePayload): SectionDTO[] {
  if (!Array.isArray(page.pageSections)) {
    return [];
  }
  return page.pageSections.map(toSectionDTO).filter((value): value is SectionDTO => value !== null);
}

export function toContactDetailDTO(detail: StrapiContactDetail) {
  return {
    type: (detail.type ?? "").trim(),
    valueHtml: detail.value ?? "",
  };
}

export function toContactClinicDTO(clinic: StrapiClinic): ContactClinicDTO | null {
  const name = normalizeOptionalText(clinic.name);
  const addressHtml = clinic.address ?? "";

  if (!name || !normalizeOptionalText(addressHtml)) return null;

  return {
    name,
    addressHtml,
    phone: clinic.phone ?? null,
    email: clinic.email ?? null,
  };
}

function toSectionDTO(raw: StrapiSectionRaw): SectionDTO | null {
  const component = (raw.__component ?? "") as SectionComponent;
  if (!KNOWN_SECTION_COMPONENTS.has(component)) return null;

  const heading = normalizeOptionalText(raw.heading);
  const intro = normalizeOptionalText(raw.intro);

  switch (component) {
    case "sections.promo-slider":
      return {
        __component: component,
        heading,
        intro,
        slides: toItemArray(raw.slides ?? raw.items, toPromoSlideItem),
      };
    case "sections.linked-resources":
      return {
        __component: component,
        heading,
        intro,
        items: toItemArray(raw.items, toLinkedResourceItem),
      };
    case "sections.social-links":
      return {
        __component: component,
        heading,
        intro,
        links: toItemArray(raw.links ?? raw.items, toSocialLinkItem),
      };
    case "sections.video":
      return {
        __component: component,
        heading,
        intro,
        videos: toItemArray(raw.videos ?? raw.items, toVideoItem),
      };
    case "sections.advantages":
      return {
        __component: component,
        heading,
        intro,
        items: toItemArray(raw.items, toAdvantageItem),
      };
    case "sections.accordion":
      return {
        __component: component,
        heading,
        intro,
        items: toItemArray(raw.items, toAccordionItem),
      };
    case "sections.faq":
      return {
        __component: component,
        heading,
        intro,
        items: toItemArray(raw.items, toFaqItem),
      };
    case "sections.tabs":
      return {
        __component: component,
        heading,
        intro,
        items: toItemArray(raw.items, toTabItem),
      };
    case "sections.gallery":
      return {
        __component: component,
        heading,
        intro,
        items: toItemArray(raw.items, toGalleryItem),
      };
    case "sections.contact":
      return {
        __component: component,
        heading,
        intro,
        details: toItemArray(raw.details, toContactDetailDTO),
        clinics: toItemArray(raw.clinics, toContactClinicDTO).filter(
          (value): value is ContactClinicDTO => value !== null,
        ),
      };
    default:
      return null;
  }
}

function toItemArray<T>(value: unknown, mapItem: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map(mapItem);
}

function toPromoSlideItem(raw: Record<string, unknown>): PromoSlideItemDTO {
  return {
    title: optionalString(raw.title),
    description: optionalString(raw.description),
    image: toMediaDTO(raw.image as StrapiMedia | null | undefined),
    targetPage: toPageRefDTO(raw.targetPage as StrapiPageRef | null | undefined),
    targetUrl: optionalString(raw.targetUrl),
  };
}

function toLinkedResourceItem(raw: Record<string, unknown>): LinkedResourceItemDTO {
  return {
    title: optionalString(raw.title),
    description: optionalString(raw.description),
    targetPage: toPageRefDTO(raw.targetPage as StrapiPageRef | null | undefined),
    targetUrl: optionalString(raw.targetUrl),
  };
}

function toSocialLinkItem(raw: Record<string, unknown>): SocialLinkItemDTO {
  return {
    name: optionalString(raw.name) ?? "",
    url: optionalString(raw.url) ?? "",
    icon: optionalString(raw.icon),
  };
}

function toVideoItem(raw: Record<string, unknown>): VideoItemDTO {
  return {
    title: optionalString(raw.title),
    videoMp4: toMediaDTO(raw.videoMp4 as StrapiMedia | null | undefined),
    videoWebm: toMediaDTO(raw.videoWebm as StrapiMedia | null | undefined),
    thumbnail: toMediaDTO(raw.thumbnail as StrapiMedia | null | undefined),
    videoTags: optionalString(raw.videoTags),
  };
}

function toAdvantageItem(raw: Record<string, unknown>): AdvantageItemDTO {
  return {
    title: optionalString(raw.title),
    description: optionalString(raw.description),
    icon: optionalString(raw.icon),
  };
}

function toAccordionItem(raw: Record<string, unknown>): AccordionItemDTO {
  return {
    title: optionalString(raw.title),
    content: optionalString(raw.content),
  };
}

function toFaqItem(raw: Record<string, unknown>): FaqItemDTO {
  return {
    question: optionalString(raw.question),
    answer: optionalString(raw.answer),
  };
}

function toTabItem(raw: Record<string, unknown>): TabItemDTO {
  return {
    title: optionalString(raw.title),
    content: optionalString(raw.content),
    link: optionalString(raw.link),
  };
}

function toGalleryItem(raw: Record<string, unknown>): GalleryItemDTO {
  return {
    caption: optionalString(raw.caption),
    image: toMediaDTO(raw.image as StrapiMedia | null | undefined),
  };
}

export function toPageDTO(page: StrapiPagePayload, config?: CmsConfig): PageDTO {
  const renderMode =
    page.pageType === "system" && isFrontendNativeSystemLayout(page.layoutVariant)
      ? "frontend-native"
      : "cms";
  const menuTitle = normalizeOptionalText(page.menuTitle);
  const navLabel = menuTitle ?? page.title;

  const effective = config ?? getCmsConfig();

  const seo = toSeoDTO(page.seo);

  return {
    documentId: page.documentId,
    locale: page.locale,
    slug: page.slug,
    title: page.title,
    menuTitle,
    navLabel,
    pageType: page.pageType,
    layoutVariant: page.layoutVariant,
    renderMode,
    seo,
    seoTitle: deriveSeoTitle(page),
    content: page.content ?? null,
    excerpt: page.excerpt ?? null,
    featuredImage: toMediaDTO(page.featuredImage, effective.strapiUrl),
    imageCenter: toMediaDTO(page.imageCenter, effective.strapiUrl),
    externalUrl: page.externalUrl ?? null,
    isFolder: Boolean(page.isFolder),
    hideFromMenu: Boolean(page.hideFromMenu),
    menuIndex: Number(page.menuIndex ?? 0),
    parentPage: toPageRefDTO(page.parentPage),
    tags: (page.tags ?? []).map(toTagDTO).filter((value): value is TagDTO => value !== null),
    infoBlockBottom: page.infoBlockBottom ?? null,
    articleAuthor: page.articleAuthor ?? null,
    sources: page.sources ?? null,
    popUpClose: page.popUpClose ?? null,
    alternateUrls: buildAlternateUrls(page, effective.siteUrl),
    sections: toSemanticSections(page),
  };
}

export function isFrontendNativeSystemLayout(layoutVariant: LayoutVariant): boolean {
  return (
    layoutVariant === "not-found" ||
    layoutVariant === "search-results" ||
    layoutVariant === "sitemap"
  );
}

const zodMedia = z
  .object({
    url: z.string().nullish(),
    alternativeText: z.string().nullish(),
    width: z.number().nullish(),
    height: z.number().nullish(),
  })
  .nullish();

const zodPageRef = z
  .object({
    documentId: z.string().nullish(),
    slug: z.string().nullish(),
    title: z.string().nullish(),
  })
  .nullish();

const zodTag = z.object({
  name: z.string().nullish(),
  slug: z.string().nullish(),
});

const zodSeo = z
  .object({
    metaTitle: z.string().nullish(),
    metaDescription: z.string().nullish(),
    canonicalUrl: z.string().nullish(),
    ogImage: zodMedia,
    robotsNoindex: z.boolean().nullish(),
    robotsNofollow: z.boolean().nullish(),
    sitemapExclude: z.boolean().nullish(),
    sitemapPriority: z.union([z.number(), z.string()]).nullish(),
    sitemapChangeFrequency: z
      .enum(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"])
      .nullish(),
  })
  .nullish();

const zodLocalization = z.object({
  documentId: z.string().nullish(),
  locale: z.string().nullish(),
  slug: z.string().nullish(),
  title: z.string().nullish(),
});

const zodPageEntity = z
  .object({
    id: z.number().optional(),
    documentId: z.string(),
    locale: z.enum(["el", "ru"]),
    slug: z.string(),
    title: z.string(),
    menuTitle: z.string().nullish(),
    pageType: z.string(),
    layoutVariant: z.string(),
    seo: zodSeo,
    content: z.string().nullish(),
    excerpt: z.string().nullish(),
    featuredImage: zodMedia,
    imageCenter: zodMedia,
    externalUrl: z.string().nullish(),
    isFolder: z.boolean().nullish(),
    hideFromMenu: z.boolean().nullish(),
    menuIndex: z.number().nullish(),
    parentPage: zodPageRef,
    tags: z.array(zodTag).nullish(),
    infoBlockBottom: z.string().nullish(),
    articleAuthor: z.string().nullish(),
    sources: z.string().nullish(),
    popUpClose: z.string().nullish(),
    pageSections: z.array(z.unknown()).nullish(),
    localizations: z.array(zodLocalization).nullish(),
  })
  .passthrough();

export const pageResponseSchema = z
  .object({
    data: z.array(zodPageEntity),
    meta: z.unknown().optional(),
  })
  .transform((response) => {
    const raw = response.data[0];
    if (!raw) return null;
    return toPageDTO(raw as StrapiPagePayload);
  });

export const pageEntitiesResponseSchema = z
  .object({
    data: z.array(zodPageEntity),
    meta: z.unknown().optional(),
  })
  .transform((response) => response.data);

export const pageListSchema = z
  .object({
    data: z.array(zodPageEntity),
    meta: z.unknown().optional(),
  })
  .transform((response) => {
    return response.data.map((raw) => toPageDTO(raw as StrapiPagePayload));
  });
