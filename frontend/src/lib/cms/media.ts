import { getCmsConfig } from "./env";
import type { MediaDTO, StrapiMedia } from "./types";

export function toMediaDTO(media: StrapiMedia | null | undefined): MediaDTO | null {
  if (!media?.url) {
    return null;
  }

  return {
    url: resolveMediaUrl(media.url),
    alternativeText: media.alternativeText ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
  };
}

function resolveMediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return new URL(url, getCmsConfig().strapiUrl).toString();
}
