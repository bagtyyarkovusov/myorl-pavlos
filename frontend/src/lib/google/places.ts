import "server-only";

import type { Locale } from "@/lib/cms/types";

import { getGooglePlacesEnv, buildGoogleMapsReviewsUrlFromPlaceId } from "./places-env";

/** BCP-47 tag for Places API `languageCode` (see places.get query params). */
export function localeToGoogleLanguageCode(locale: Locale): string {
  switch (locale) {
    case "el":
      return "el";
    case "ru":
      return "ru";
    default: {
      const _exhaustive: never = locale;
      return _exhaustive;
    }
  }
}

export type GoogleReviewQuote = {
  text: string;
  author: string;
  rating?: number | null;
  relativeTime?: string | null;
};

export type GooglePlaceReviewTeaser = {
  listingUrl: string;
  /** From Places `googleMapsLinks.reviewsUri`, or place-id fallback */
  reviewsUrl: string;
  placeDisplayName?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  reviews: GoogleReviewQuote[];
};

type PlacesDisplayName = { text?: string };

type PlacesReview = {
  rating?: number;
  relativePublishTimeDescription?: string;
  text?: { text?: string };
  authorAttribution?: { displayName?: string };
};

type PlacesDetailsPayload = {
  displayName?: PlacesDisplayName;
  rating?: number;
  userRatingCount?: number;
  reviews?: PlacesReview[];
  googleMapsLinks?: {
    reviewsUri?: string;
  };
};

function placeResourceUrl(placeId: string, languageCode: string): string {
  const id = placeId.replace(/^places\//, "");
  const base = `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`;
  const params = new URLSearchParams({ languageCode });
  return `${base}?${params.toString()}`;
}

function normalizeReviews(raw: PlacesReview[] | undefined): GoogleReviewQuote[] {
  if (!raw?.length) {
    return [];
  }
  return raw.map((r) => ({
    text: r.text?.text?.trim() ?? "",
    author: r.authorAttribution?.displayName?.trim() ?? "",
    rating: r.rating ?? null,
    relativeTime: r.relativePublishTimeDescription?.trim() ?? null,
  }));
}

/**
 * Fetches a small set of Google Maps reviews and aggregate stats (Places API New).
 * `languageCode` is derived from the site locale so review snippets and related strings
 * favor Greek or Russian instead of the API default (often English).
 * Cached for one hour per locale via Next.js fetch caching (URL includes languageCode).
 */
export async function getGooglePlaceReviewTeaser(locale: Locale): Promise<GooglePlaceReviewTeaser | null> {
  const env = getGooglePlacesEnv();
  if (!env) {
    return null;
  }

  const languageCode = localeToGoogleLanguageCode(locale);

  try {
    const res = await fetch(placeResourceUrl(env.placeId, languageCode), {
      headers: {
        "X-Goog-Api-Key": env.apiKey,
        "X-Goog-FieldMask": "reviews,rating,userRatingCount,displayName,googleMapsLinks",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as PlacesDetailsPayload;
    const reviews = normalizeReviews(data.reviews).filter((r) => r.text.length > 0);
    reviews.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    const reviewsUri = data.googleMapsLinks?.reviewsUri?.trim();
    const reviewsUrl = reviewsUri || buildGoogleMapsReviewsUrlFromPlaceId(env.placeId);

    return {
      listingUrl: env.listingUrl,
      reviewsUrl,
      placeDisplayName: data.displayName?.text?.trim() ?? null,
      rating: data.rating ?? null,
      userRatingCount: data.userRatingCount ?? null,
      reviews,
    };
  } catch {
    return null;
  }
}
