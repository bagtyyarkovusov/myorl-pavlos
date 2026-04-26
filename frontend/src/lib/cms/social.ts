import { normalizeOptionalText } from "./text";
import type { SocialLinkDTO, SocialPlatform, StrapiSocialLink } from "./types";

export function deriveSocialPlatform(link: StrapiSocialLink): SocialPlatform | null {
  const label = (link.name ?? "").trim().toLowerCase();
  const hostname = safeHostname(link.url);

  if (label === "google plus" || hostname.includes("plus.google")) {
    return null;
  }
  if (label === "facebook" || hostname.includes("facebook.com")) {
    return "facebook";
  }
  if (label === "instagram" || hostname.includes("instagram.com")) {
    return "instagram";
  }
  if (label === "youtube" || hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    return "youtube";
  }
  if (label === "google" || hostname.includes("google.")) {
    return "google";
  }
  return null;
}

export function toSocialLinkDTO(link: StrapiSocialLink): SocialLinkDTO | null {
  const platform = deriveSocialPlatform(link);
  const label = normalizeOptionalText(link.name);
  const url = normalizeOptionalText(link.url);

  if (!platform || !label || !url) {
    return null;
  }

  return {
    label,
    url,
    platform,
  };
}

function safeHostname(url: string | null | undefined): string {
  if (!url) {
    return "";
  }
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
