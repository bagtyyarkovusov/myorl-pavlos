type NotFoundParams = Promise<{
  locale?: string;
  slug?: string;
}>;

/**
 * Resolves locale and slug for localized 404 pages from route params.
 *
 * Falls back to the default locale when params are missing — `not-found.tsx`
 * must stay statically renderable (calling `headers()` here would force the
 * containing page to render dynamically; Next.js 16 then errors with
 * `Page changed from static to dynamic at runtime, reason: headers`).
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
      // Fall through to defaults below.
    }
  }

  return { locale: "el", slug: "" };
}
