import type { Locale } from "@/lib/cms/types";

const LOCALE_PREFIX = /^\/(el|ru)(\/|$)/;

export function switchLocaleInPath(pathname: string, targetLocale: Locale): string {
  if (LOCALE_PREFIX.test(pathname)) {
    return pathname.replace(LOCALE_PREFIX, `/${targetLocale}$2`);
  }
  return `/${targetLocale}${pathname}`;
}

export function hasLoadedAlternateUrls(alternateUrls: Partial<Record<Locale, string>>): boolean {
  return Object.keys(alternateUrls).length > 0;
}

/** True when the page has loaded alternates but has no partner in `targetLocale`. */
export function isLocaleSwitchBlocked(
  targetLocale: Locale,
  alternateUrls: Partial<Record<Locale, string>>,
): boolean {
  return hasLoadedAlternateUrls(alternateUrls) && !alternateUrls[targetLocale];
}

export function canSwitchToLocale(
  targetLocale: Locale,
  alternateUrls: Partial<Record<Locale, string>>,
): boolean {
  return !isLocaleSwitchBlocked(targetLocale, alternateUrls);
}

/**
 * Resolves the href for a locale switcher target.
 *
 * Uses CMS alternate URLs when available, otherwise swaps the locale prefix in
 * the current pathname while alternates are still loading.
 */
export function resolveLocaleHref(
  pathname: string | null,
  targetLocale: Locale,
  alternateUrls: Partial<Record<Locale, string>>,
): string {
  const alternate = alternateUrls[targetLocale];
  if (alternate) return alternate;

  return switchLocaleInPath(pathname ?? "/", targetLocale);
}
