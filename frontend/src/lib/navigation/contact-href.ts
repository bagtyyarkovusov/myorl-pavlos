import { hrefForPage } from "@/lib/cms/navigation";
import type { Locale, NavigationInput } from "@/lib/cms/types";

const DEFAULT_NEEDLES = ["contact", "epikoinonia", "επικοινωνία", "kontakt", "контакт", "kontakty"];

const LOCALE_FALLBACK_SLUG: Record<Locale, string> = {
  el: "epikoinonia",
  ru: "kontakty",
};

export function defaultContactHref(locale: Locale): string {
  return `/${locale}/${LOCALE_FALLBACK_SLUG[locale]}`;
}

function haystackForPage(page: NavigationInput): string {
  return `${page.slug} ${page.title} ${page.menuTitle ?? ""} ${page.navLabel}`.toLowerCase();
}

function matchesNeedles(page: NavigationInput, needles: string[]): boolean {
  const haystack = haystackForPage(page);
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

/**
 * Resolves the general Contact Page URL from all CMS pages (including menu-hidden).
 */
export function resolveContactHref(
  pages: NavigationInput[],
  locale: Locale,
  fallback: string = `/${locale}`,
): string {
  const scoped = pages.filter((page) => page.locale === locale);

  const byLayout = scoped.find((page) => page.layoutVariant === "contact");
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
