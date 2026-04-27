import type { Locale } from "./common";

export type SocialPlatform = "facebook" | "google" | "instagram" | "youtube";

export type SocialLinkDTO = {
  label: string;
  url: string;
  platform: SocialPlatform;
};

export type GlobalSettingsDTO = {
  locale: Locale;
  address: string | null;
  phoneTel: string | null;
  phoneDisplay: string | null;
  hours: string | null;
};

export type StrapiGlobalPayload = {
  id?: number;
  documentId?: string;
  locale?: Locale | string | null;
  address?: string | null;
  phoneTel?: string | null;
  phoneDisplay?: string | null;
  hours?: string | null;
};

export type StrapiSocialLink = {
  name?: string | null;
  url?: string | null;
};
