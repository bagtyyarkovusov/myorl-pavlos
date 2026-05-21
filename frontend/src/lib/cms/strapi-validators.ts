import { z } from "zod";

const optionalStringTransform = z
  .string()
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

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
    locale: z.string().nullish(),
    featuredImage: zodMedia,
    imageCenter: zodMedia,
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
    schemaType: z
      .enum(["WebPage", "MedicalWebPage", "AboutPage", "ContactPage", "CollectionPage"])
      .nullish(),
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

export const zodPageEntity = z
  .object({
    id: z.number().optional(),
    documentId: z.string(),
    locale: z.enum(["el", "ru"]),
    slug: z.string(),
    title: z.string(),
    menuTitle: z.string().nullish(),
    pageType: z
      .string()
      .nullish()
      .transform((v) => v ?? "content"),
    layoutVariant: z
      .string()
      .nullish()
      .transform((v) => v ?? "default"),
    seo: zodSeo,
    content: z.string().nullish(),
    excerpt: z.string().nullish(),
    featuredImage: zodMedia,
    imageCenter: zodMedia,
    externalUrl: z.string().nullish(),
    isFolder: z.boolean().nullish(),
    hideFromMenu: z.boolean().nullish(),
    menuIndex: z.number().nullish(),
    footerCategory: z.enum(["services", "patients", "company", "none"]).nullish(),
    parentPage: zodPageRef,
    relatedPages: z.array(zodPageRef).nullish(),
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
  .transform((response) => response.data[0] ?? null);

export const pageEntitiesResponseSchema = z
  .object({
    data: z.array(zodPageEntity),
    meta: z.unknown().optional(),
  })
  .transform((response) => response.data);

export const pageListResponseSchema = z
  .object({
    data: z.array(zodPageEntity),
    meta: z.unknown().optional(),
  })
  .transform((response) => response.data);

export const zodVideoEntryEntity = z
  .object({
    documentId: z.string(),
    locale: z.enum(["el", "ru"]),
    title: z.string(),
    youtubeId: z.string(),
    youtubeUrl: z.string().nullish(),
    categories: z.unknown().nullish(),
    sortOrder: z.number().nullish(),
    relatedArticle: zodPageRef,
    legacyArticleUrl: z.string().nullish(),
  })
  .passthrough();

const strapiGlobalEntitySchema = z
  .object({
    id: z.number().optional(),
    documentId: z.string(),
    locale: z.string(),
    address: optionalStringTransform,
    phoneTel: optionalStringTransform,
    phoneDisplay: optionalStringTransform,
    hours: optionalStringTransform,
  })
  .passthrough();

export const globalResponseSchema = z
  .object({
    data: strapiGlobalEntitySchema.nullable(),
    meta: z.unknown().optional(),
  })
  .transform((response) => {
    if (!response.data) return null;
    return {
      locale: (response.data.locale === "el" || response.data.locale === "ru"
        ? response.data.locale
        : "el") as "el" | "ru",
      address: response.data.address,
      phoneTel: response.data.phoneTel,
      phoneDisplay: response.data.phoneDisplay,
      hours: response.data.hours,
    };
  });
