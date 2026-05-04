import "server-only";

export type GooglePlacesEnv = {
  apiKey: string;
  placeId: string;
  listingUrl: string;
};

/**
 * Reads Google Maps / Places config from the server environment.
 * Optional GOOGLE_MAPS_LISTING_URL overrides the generated maps link (e.g. a goo.gl / share URL).
 */
export function getGooglePlacesEnv(): GooglePlacesEnv | null {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim()?.replace(/^places\//, "");
  const listingOverride = process.env.GOOGLE_MAPS_LISTING_URL?.trim();

  if (!apiKey || !placeId) {
    return null;
  }

  const listingUrl =
    listingOverride ||
    `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`;

  return { apiKey, placeId, listingUrl };
}

/** Public listing URL when only a link is configured (no API credentials). */
export function getGoogleMapsListingUrlOnly(): string | null {
  const full = getGooglePlacesEnv();
  if (full) {
    return full.listingUrl;
  }
  return process.env.GOOGLE_MAPS_LISTING_URL?.trim() || null;
}

/**
 * Best-effort Maps URL focused on the Place id (maps to listing; API `reviewsUri` is preferred when available).
 */
export function buildGoogleMapsReviewsUrlFromPlaceId(placeId: string): string {
  const id = placeId.replace(/^places\//, "");
  return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(id)}`;
}
