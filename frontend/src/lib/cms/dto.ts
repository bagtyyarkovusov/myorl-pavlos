import { getCmsConfig } from "./env";
import type {
  AccordionItemDTO,
  AdvantageItemDTO,
  FaqItemDTO,
  GalleryItemDTO,
  LinkedResourceItemDTO,
  PromoSlideItemDTO,
  SectionComponent,
  SectionDTO,
  SocialLinkItemDTO,
  StrapiSectionRaw,
  TabItemDTO,
  VideoItemDTO,
} from "./sections";
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

export function isFrontendNativeSystemLayout(layoutVariant: LayoutVariant): boolean {
  return (
    layoutVariant === "not-found" ||
    layoutVariant === "search-results" ||
    layoutVariant === "sitemap"
  );
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

function toSemanticSections(page: StrapiPagePayload): SectionDTO[] {
  const collected: Array<StrapiSectionRaw & { __component?: string | null }> = [];

  if (page.pageType === "home" && Array.isArray(page.pageSections)) {
    collected.push(...page.pageSections);
  }

  pushIfPresent(collected, page.faqSection, "sections.faq");
  pushIfPresent(collected, page.accordionSection, "sections.accordion");
  pushIfPresent(collected, page.tabsSection, "sections.tabs");
  pushIfPresent(collected, page.gallerySection, "sections.gallery");

  if (page.contactSection) {
    collected.push({ ...page.contactSection, __component: "sections.contact" });
  }

  return collected.map(toSectionDTO).filter((value): value is SectionDTO => value !== null);
}

function pushIfPresent(
  acc: Array<StrapiSectionRaw & { __component?: string | null }>,
  raw: StrapiSectionRaw | null | undefined,
  fallbackComponent: SectionComponent,
): void {
  if (!raw) {
    return;
  }
  acc.push({ ...raw, __component: raw.__component ?? fallbackComponent });
}

function toSectionDTO(raw: StrapiSectionRaw): SectionDTO | null {
  const component = (raw.__component ?? "") as SectionComponent;
  if (!KNOWN_SECTION_COMPONENTS.has(component)) {
    return null;
  }

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
  }
}

function toItemArray<T>(value: unknown, mapItem: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
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
    name: (optionalString(raw.name) ?? "") as string,
    url: (optionalString(raw.url) ?? "") as string,
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

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? normalizeOptionalText(value) : null;
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
