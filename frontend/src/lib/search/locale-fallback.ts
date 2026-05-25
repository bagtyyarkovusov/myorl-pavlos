import type { SearchDocument } from "@/lib/search/index-document";
import type { Locale } from "@/lib/cms/types";

export function otherLocale(locale: Locale): Locale {
  return locale === "el" ? "ru" : "el";
}

/**
 * Given a SearchDocument (which may be from the "other" locale) and
 * the visitor's locale, return the best href:
 *
 * 1. If result has a localization matching visitor's locale → swap href
 * 2. If result has no matching localization → keep result's own href
 * 3. Same-locale result → no-op (return unchanged)
 */
export function resolveFallbackHref(doc: SearchDocument, visitorLocale: Locale): string {
  // Same locale — no swap needed
  if (doc.locale === visitorLocale) {
    return doc.href;
  }

  // Look for a localization entry for the visitor's locale
  const localization = doc.localizations.find((l) => l.locale === visitorLocale);

  // Swap to visitor-locale href if one exists, otherwise keep original
  return localization?.href ?? doc.href;
}
