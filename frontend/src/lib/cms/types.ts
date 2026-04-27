export { LOCALES, isLocale, type Locale, type MediaDTO, type PageRefDTO } from "./types/common";

export type {
  ContactClinicDTO,
  ContactDetailDTO,
  StrapiClinic,
  StrapiContactDetail,
} from "./types/contact";

export type {
  GlobalSettingsDTO,
  SocialLinkDTO,
  SocialPlatform,
  StrapiGlobalPayload,
  StrapiSocialLink,
} from "./types/global";

export type {
  LayoutVariant,
  NavigationInput,
  NavigationNodeDTO,
  PageDTO,
  PageType,
  RenderMode,
  StrapiLocalization,
  StrapiPagePayload,
  StrapiPageRef,
  StrapiListResponse,
  StrapiSingleResponse,
} from "./types/page";

export type { SectionDTO } from "./types/sections";

export type { LinkedResourceItemDTO, PromoSlideItemDTO, VideoItemDTO } from "./types/sections";

export type { SeoDTO, SitemapChangeFrequency, StrapiMedia, StrapiSeo } from "./types/seo";

export type { TagDTO, StrapiTag } from "./types/tag";
