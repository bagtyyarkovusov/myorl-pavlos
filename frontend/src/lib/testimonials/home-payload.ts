import "server-only";

import { getGooglePlaceReviewTeaser } from "@/lib/google/places";
import {
  buildGoogleMapsReviewsUrlFromPlaceId,
  getGoogleMapsListingUrlOnly,
  getGooglePlacesEnv,
} from "@/lib/google/places-env";
import type { Locale } from "@/lib/cms/types";

import { getCuratedTestimonials } from "./curated";

export type HomeTestimonialQuote = {
  text: string;
  author: string;
  rating?: number | null;
  relativeTime?: string | null;
};

export type HomeTestimonialsPayload = {
  quotes: HomeTestimonialQuote[];
  /** Listing / share URL for attribution and general Maps context */
  googleMapsUrl: string;
  /** Reviews-focused Maps URL (`googleMapsLinks.reviewsUri` when available) */
  googleMapsReviewsUrl: string;
  placeDisplayName?: string | null;
  aggregateRating?: number | null;
  userRatingCount?: number | null;
  /** Whether quotes came from the Places API or fall back to curated samples. */
  source: "google" | "curated";
};

const HOME_QUOTE_LIMIT = 5;

function curatedToHomeQuotes(locale: Locale): HomeTestimonialQuote[] {
  const curated = getCuratedTestimonials(locale);
  const sorted = [...curated].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return sorted.slice(0, HOME_QUOTE_LIMIT).map((c) => ({
    text: c.quote,
    author: c.author,
    rating: c.rating ?? null,
    relativeTime: null,
  }));
}

/**
 * Home teaser: prefers live Google reviews (Places API); falls back to curated quotes.
 * Returns null if there is no Maps URL and nothing to show.
 */
export async function getHomeTestimonialsPayload(
  locale: Locale,
): Promise<HomeTestimonialsPayload | null> {
  const teaser = await getGooglePlaceReviewTeaser(locale);
  const listingFromEnv = getGoogleMapsListingUrlOnly();

  if (teaser && teaser.reviews.length > 0) {
    return {
      quotes: teaser.reviews.slice(0, HOME_QUOTE_LIMIT).map((r) => ({
        text: r.text,
        author: r.author,
        rating: r.rating,
        relativeTime: r.relativeTime,
      })),
      googleMapsUrl: teaser.listingUrl,
      googleMapsReviewsUrl: teaser.reviewsUrl,
      placeDisplayName: teaser.placeDisplayName,
      aggregateRating: teaser.rating,
      userRatingCount: teaser.userRatingCount,
      source: "google",
    };
  }

  const curatedQuotes = curatedToHomeQuotes(locale);
  if (!listingFromEnv || curatedQuotes.length === 0) {
    return null;
  }

  const env = getGooglePlacesEnv();
  const reviewsFallback = env ? buildGoogleMapsReviewsUrlFromPlaceId(env.placeId) : listingFromEnv;

  return {
    quotes: curatedQuotes,
    googleMapsUrl: listingFromEnv,
    googleMapsReviewsUrl: teaser?.reviewsUrl ?? reviewsFallback,
    placeDisplayName: null,
    aggregateRating: teaser?.rating ?? null,
    userRatingCount: teaser?.userRatingCount ?? null,
    source: "curated",
  };
}
