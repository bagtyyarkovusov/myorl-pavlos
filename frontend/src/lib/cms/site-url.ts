const DEFAULT_SITE_URL = "http://localhost:3000";

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Resolves the public site origin without requiring the full Strapi env.
 *
 * Reads `NEXT_PUBLIC_SITE_URL` and falls back to `DEFAULT_SITE_URL`. Safe to
 * call from routes that do not touch the CMS (root layout metadata, robots,
 * the not-found page) so build-time prerender does not require `STRAPI_URL`.
 */
export function getSiteUrl(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL);
}
