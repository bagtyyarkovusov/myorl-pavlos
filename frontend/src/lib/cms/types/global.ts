import type { Locale } from "./common";
import type { SocialLinkItemDTO } from "./sections";

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
  secondaryPhoneTel: string | null;
  secondaryPhoneDisplay: string | null;
  email: string | null;
  hours: string | null;
  socialLinks: SocialLinkItemDTO[];
};

export type StrapiGlobalPayload = {
  id?: number;
  documentId?: string;
  locale?: Locale | string | null;
  address?: string | null;
  phoneTel?: string | null;
  phoneDisplay?: string | null;
  secondaryPhoneTel?: string | null;
  secondaryPhoneDisplay?: string | null;
  email?: string | null;
  hours?: string | null;
  socialLinks?: StrapiSocialLink[] | null;
};

export type StrapiSocialLink = {
  name?: string | null;
  url?: string | null;
  icon?: string | null;
};
