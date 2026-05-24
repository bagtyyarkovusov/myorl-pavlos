import { isFrontendNativeSystemLayout } from "@/lib/cms/page-normalizer";
import type { LayoutVariant, Locale, PageDTO, VideoEntryDTO } from "@/lib/cms/types";

export type SearchDocument = {
  id: string;
  type: "page" | "video";
  locale: Locale;
  title: string;
  excerpt: string;
  body: string;
  slug: string;
  href: string;
  thumbnail: string | null;
  parentTitle: string | null;
  parentSlug: string | null;
  publishedAt: string;
  parentSection: string | null;
  tags: string[];
  layoutVariant: LayoutVariant;
  _rankBoost: number;
  localizations: Array<{ locale: Locale; slug: string; href: string }>;
};

const PAGE_RANK_BOOST = 100;
const VIDEO_RANK_BOOST = 50;

export function indexPageDocument(page: PageDTO): SearchDocument | null {
  if (
    isFrontendNativeSystemLayout(page.layoutVariant) ||
    page.layoutVariant === "appointment-form"
  ) {
    return null;
  }

  return {
    id: "page:" + page.documentId,
    type: "page",
    locale: page.locale,
    title: page.title,
    excerpt: stripHtml(page.excerpt ?? ""),
    body: flattenPageBody(page),
    slug: page.slug,
    href: hrefForLocaleSlug(page.locale, page.slug),
    thumbnail: page.imageCenter?.url ?? page.featuredImage?.url ?? null,
    parentTitle: page.parentPage?.title ?? null,
    parentSlug: page.parentPage?.slug ?? null,
    publishedAt: new Date().toISOString(),
    parentSection: page.parentPage?.slug ?? null,
    tags: page.tags.map((tag) => tag.slug),
    layoutVariant: page.layoutVariant,
    _rankBoost: PAGE_RANK_BOOST,
    localizations: localizationsForPage(page),
  };
}

export function indexVideoDocument(video: VideoEntryDTO): SearchDocument | null {
  if (!video.title?.trim()) return null;

  return {
    id: "video:" + video.documentId,
    type: "video",
    locale: video.locale,
    title: video.title,
    excerpt: video.categories.map((c) => c.label).join(", "),
    body: video.categories.map((c) => c.label).join(" "),
    slug: "",
    href: "/" + video.locale + "/video",
    thumbnail: null,
    parentTitle: null,
    parentSlug: null,
    publishedAt: new Date().toISOString(),
    parentSection: null,
    tags: video.categories.map((c) => c.slug),
    layoutVariant: "video-index",
    _rankBoost: VIDEO_RANK_BOOST,
    localizations: [],
  };
}

function flattenPageBody(page: PageDTO): string {
  return normalizeWhitespace(
    [
      stripHtml(page.content ?? ""),
      ...page.sections.flatMap((section) => {
        const sectionText = [section.heading, section.intro];

        if (section.__component === "sections.faq") {
          return [
            ...sectionText,
            ...section.items.flatMap((item) => [item.question, stripHtml(item.answer ?? "")]),
          ];
        }

        if (section.__component === "sections.accordion") {
          return [
            ...sectionText,
            ...section.items.flatMap((item) => [item.title, stripHtml(item.content ?? "")]),
          ];
        }

        return [];
      }),
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" "),
  );
}

function localizationsForPage(page: PageDTO): SearchDocument["localizations"] {
  return Object.entries(page.alternateUrls)
    .filter(([locale]) => locale !== page.locale)
    .map(([locale, href]) => {
      const parsedLocale = locale as Locale;
      return {
        locale: parsedLocale,
        slug: slugFromHref(parsedLocale, href ?? ""),
        href: href ?? hrefForLocaleSlug(parsedLocale, "index"),
      };
    });
}

function hrefForLocaleSlug(locale: Locale, slug: string): string {
  return slug === "index" ? "/" + locale : "/" + locale + "/" + slug;
}

function slugFromHref(locale: Locale, href: string): string {
  try {
    const path = href.startsWith("http") ? new URL(href).pathname : href;
    const prefix = "/" + locale + "/";
    if (path === "/" + locale) return "index";
    if (path.startsWith(prefix)) return path.slice(prefix.length);
  } catch {
    return "index";
  }
  return "index";
}

function stripHtml(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'"),
  );
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
