import { hrefForPage } from "@/lib/cms/navigation";
import type { Locale, NavigationInput, NavigationNodeDTO } from "@/lib/cms/types";

const DEFAULT_NEEDLES = ["appointment", "rantevou", "ραντεβού", "записаться", "zapis"];

const LOCALE_FALLBACK_SLUG: Record<Locale, string> = {
  el: "rantevou",
  ru: "zapis",
};

export function defaultAppointmentHref(locale: Locale): string {
  return `/${locale}/${LOCALE_FALLBACK_SLUG[locale]}`;
}

function haystackForPage(page: NavigationInput): string {
  return `${page.slug} ${page.title} ${page.menuTitle ?? ""} ${page.navLabel}`.toLowerCase();
}

function matchesNeedles(page: NavigationInput, needles: string[]): boolean {
  const haystack = haystackForPage(page);
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function findInTree(nodes: NavigationNodeDTO[], needles: string[]): string | null {
  for (const node of nodes) {
    if (matchesNeedles(node, needles)) {
      return node.href;
    }
    const childMatch = findInTree(node.children, needles);
    if (childMatch) {
      return childMatch;
    }
  }
  return null;
}

/**
 * Resolves the primary "book appointment" URL from all CMS pages (including menu-hidden).
 */
export function resolveAppointmentHref(
  pages: NavigationInput[],
  locale: Locale,
  fallback: string = `/${locale}`,
): string {
  const scoped = pages.filter((page) => page.locale === locale);

  const byLayout = scoped.find((page) => page.layoutVariant === "appointment-form");
  if (byLayout) {
    return hrefForPage(byLayout);
  }

  const byNeedle = scoped.find((page) => matchesNeedles(page, DEFAULT_NEEDLES));
  if (byNeedle) {
    return hrefForPage(byNeedle);
  }

  const fallbackSlug = LOCALE_FALLBACK_SLUG[locale];
  const byFallbackSlug = scoped.find((page) => page.slug === fallbackSlug);
  if (byFallbackSlug) {
    return hrefForPage(byFallbackSlug);
  }

  return fallbackSlug ? `/${locale}/${fallbackSlug}` : fallback;
}

/**
 * Resolves the primary "book appointment" URL from the visible navigation tree.
 *
 * Prefer {@link resolveAppointmentHref} with the full page list — appointment pages
 * are often hidden from the menu.
 */
export function findAppointmentHref(
  navigation: NavigationNodeDTO[],
  locale: Locale,
  fallback: string = `/${locale}`,
): string {
  return findInTree(navigation, DEFAULT_NEEDLES) ?? fallback;
}
