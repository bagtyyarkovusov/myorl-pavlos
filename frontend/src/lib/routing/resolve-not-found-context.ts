import { headers } from "next/headers";

import { isLocale } from "@/lib/cms/types";

type NotFoundParams = Promise<{
  locale?: string;
  slug?: string;
}>;

/**
 * Resolves locale and slug for localized 404 pages.
 * Params may be missing during some client navigations; falls back to x-pathname.
 */
export async function resolveNotFoundContext(
  params?: NotFoundParams,
): Promise<{ locale: string; slug: string }> {
  if (params) {
    try {
      const resolved = await params;
      if (resolved?.locale) {
        return {
          locale: resolved.locale,
          slug: resolved.slug ?? "",
        };
      }
    } catch {
      // Fall through to pathname parsing.
    }
  }

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const segments = pathname.split("/").filter(Boolean);
  const localeCandidate = segments[0] ?? "el";
  const locale = isLocale(localeCandidate) ? localeCandidate : "el";
  const slug = segments[1] ?? "";

  return { locale, slug };
}
