import { getCmsConfig } from "./env";
import type {
  ContactClinicDTO,
  LayoutVariant,
  MediaDTO,
  NavigationInput,
  NavigationNodeDTO,
  PageDTO,
  PageRefDTO,
  SeoDTO,
  SocialLinkDTO,
  SocialPlatform,
  StrapiClinic,
  StrapiContactDetail,
  StrapiMedia,
  StrapiPagePayload,
  StrapiPageRef,
  StrapiSeo,
  StrapiSocialLink,
  StrapiTag,
  TagDTO,
} from "./types";

export function isFrontendNativeSystemLayout(layoutVariant: LayoutVariant): boolean {
  return layoutVariant === "not-found" || layoutVariant === "search-results" || layoutVariant === "sitemap";
}

export function toPageDTO(page: StrapiPagePayload): PageDTO {
  const renderMode =
    page.pageType === "system" && isFrontendNativeSystemLayout(page.layoutVariant)
      ? "frontend-native"
      : "cms";
  const menuTitle = normalizeOptionalText(page.menuTitle);
  const navLabel = menuTitle ?? page.title;
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
    seoTitle: normalizeOptionalText(seo.metaTitle) ?? page.title,
    content: page.content ?? null,
    excerpt: page.excerpt ?? null,
    featuredImage: toMediaDTO(page.featuredImage),
    imageCenter: toMediaDTO(page.imageCenter),
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
    sections: toSemanticSections(page),
    contact: toContactDTO(page.contactSection),
  };
}

export function buildNavigationTree(pages: NavigationInput[], locale: string): NavigationNodeDTO[] {
  const scopedPages = pages
    .filter((page) => page.locale === locale && !page.hideFromMenu)
    .sort(compareNavigationItems);

  const nodes = new Map<string, NavigationNodeDTO>();
  for (const page of scopedPages) {
    nodes.set(page.documentId, {
      ...page,
      href: hrefForPage(page),
      children: [],
    });
  }

  const roots: NavigationNodeDTO[] = [];
  for (const node of nodes.values()) {
    const parentDocumentId = node.parentPage?.documentId;
    const parent = parentDocumentId ? nodes.get(parentDocumentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const node of nodes.values()) {
    node.children.sort(compareNavigationItems);
  }
  roots.sort(compareNavigationItems);

  return roots;
}

export function hrefForPage(page: Pick<PageDTO, "locale" | "slug" | "externalUrl">): string {
  const external = normalizeOptionalText(page.externalUrl);
  if (external) {
    return external;
  }
  return page.slug === "index" ? `/${page.locale}` : `/${page.locale}/${page.slug}`;
}

export function deriveSocialPlatform(link: StrapiSocialLink): SocialPlatform | null {
  const label = (link.name ?? "").trim().toLowerCase();
  const hostname = safeHostname(link.url);

  if (label === "google plus" || hostname.includes("plus.google")) {
    return null;
  }
  if (label === "facebook" || hostname.includes("facebook.com")) {
    return "facebook";
  }
  if (label === "instagram" || hostname.includes("instagram.com")) {
    return "instagram";
  }
  if (label === "youtube" || hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    return "youtube";
  }
  if (label === "google" || hostname.includes("google.")) {
    return "google";
  }
  return null;
}

export function toSocialLinkDTO(link: StrapiSocialLink): SocialLinkDTO | null {
  const platform = deriveSocialPlatform(link);
  const label = normalizeOptionalText(link.name);
  const url = normalizeOptionalText(link.url);

  if (!platform || !label || !url) {
    return null;
  }

  return {
    label,
    url,
    platform,
  };
}

function compareNavigationItems(left: NavigationInput, right: NavigationInput): number {
  return (
    left.menuIndex - right.menuIndex ||
    left.slug.localeCompare(right.slug) ||
    left.navLabel.localeCompare(right.navLabel)
  );
}

function toSemanticSections(page: StrapiPagePayload): unknown[] | undefined {
  if (page.pageType === "home") {
    return page.pageSections ?? [];
  }
  if (page.pageType === "faq") {
    return page.faqSection ? [page.faqSection] : [];
  }
  if (page.pageType === "accordion") {
    return page.accordionSection ? [page.accordionSection] : [];
  }
  if (page.pageType === "tabs") {
    return page.tabsSection ? [page.tabsSection] : [];
  }
  if (page.pageType === "gallery") {
    return page.gallerySection ? [page.gallerySection] : [];
  }
  return undefined;
}

function toContactDTO(section: StrapiPagePayload["contactSection"]): PageDTO["contact"] {
  if (!section) {
    return undefined;
  }

  return {
    details: (section.details ?? []).map(toContactDetailDTO),
    clinics: (section.clinics ?? [])
      .map(toContactClinicDTO)
      .filter((value): value is ContactClinicDTO => value !== null),
  };
}

function toContactDetailDTO(detail: StrapiContactDetail) {
  return {
    type: (detail.type ?? "").trim(),
    valueHtml: detail.value ?? "",
  };
}

function toContactClinicDTO(clinic: StrapiClinic): ContactClinicDTO | null {
  const name = normalizeOptionalText(clinic.name);
  const addressHtml = clinic.address ?? "";

  if (!name || !normalizeOptionalText(addressHtml)) {
    return null;
  }

  return {
    name,
    addressHtml,
    phone: clinic.phone ?? null,
    email: clinic.email ?? null,
  };
}

function toPageRefDTO(ref: StrapiPageRef | null | undefined): PageRefDTO | null {
  if (!ref?.documentId) {
    return null;
  }

  return {
    documentId: ref.documentId,
    slug: ref.slug ?? null,
    title: ref.title ?? null,
  };
}

function toTagDTO(tag: StrapiTag | null | undefined): TagDTO | null {
  const name = normalizeOptionalText(tag?.name);
  const slug = normalizeOptionalText(tag?.slug);
  if (!name || !slug) {
    return null;
  }

  return { name, slug };
}

function toSeoDTO(seo: StrapiSeo | null | undefined): SeoDTO {
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

function toMediaDTO(media: StrapiMedia | null | undefined): MediaDTO | null {
  if (!media?.url) {
    return null;
  }

  return {
    url: resolveMediaUrl(media.url),
    alternativeText: media.alternativeText ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
  };
}

function resolveMediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return new URL(url, getCmsConfig().strapiUrl).toString();
}

function normalizePriority(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const priority = Number(value);
  if (!Number.isFinite(priority)) {
    return null;
  }
  return Math.min(1, Math.max(0, priority));
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized ? normalized : null;
}

function safeHostname(url: string | null | undefined): string {
  if (!url) {
    return "";
  }
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
