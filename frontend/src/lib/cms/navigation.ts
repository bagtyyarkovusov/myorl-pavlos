import { getCmsConfig } from "./env";
import { normalizeOptionalText } from "./text";
import { isLocale } from "./types";
import type {
  Locale,
  NavigationInput,
  NavigationNodeDTO,
  PageDTO,
  StrapiLocalization,
  StrapiPagePayload,
} from "./types";

export function buildNavigationTree(pages: NavigationInput[], locale: Locale): NavigationNodeDTO[] {
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
  return hrefForLocaleSlug(page.locale, page.slug);
}

export function hrefForLocaleSlug(locale: Locale, slug: string): string {
  return slug === "index" ? `/${locale}` : `/${locale}/${slug}`;
}

export function buildAlternateUrls(page: StrapiPagePayload): Partial<Record<Locale, string>> {
  const urlByLocale = new Map<Locale, string>();
  urlByLocale.set(page.locale, absoluteHref(page.locale, page.slug));

  for (const localization of page.localizations ?? []) {
    const locale = localization.locale;
    const slug = localization.slug;
    if (locale && isLocale(locale) && slug) {
      urlByLocale.set(locale, absoluteHref(locale, slug));
    }
  }

  return Object.fromEntries(urlByLocale) as Partial<Record<Locale, string>>;
}

function absoluteHref(locale: Locale, slug: string): string {
  return new URL(hrefForLocaleSlug(locale, slug), getCmsConfig().siteUrl).toString();
}

function compareNavigationItems(left: NavigationInput, right: NavigationInput): number {
  return (
    left.menuIndex - right.menuIndex ||
    left.slug.localeCompare(right.slug) ||
    left.navLabel.localeCompare(right.navLabel)
  );
}

export function toLocalizationList(value: unknown): StrapiLocalization[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is StrapiLocalization => typeof item === "object" && item !== null,
  );
}
