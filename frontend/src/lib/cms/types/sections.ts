import type { SectionComponent } from "@myorl-pavlos/shared-types";
import type { MediaDTO, PageRefDTO } from "./common";
import type { ContactClinicDTO, ContactDetailDTO } from "./contact";

export type { SectionComponent };

type SectionBase = {
  heading?: string | null;
  intro?: string | null;
};

export type PromoSlideItemDTO = {
  title?: string | null;
  description?: string | null;
  targetPageExcerpt?: string | null;
  image?: MediaDTO | null;
  targetPage?: PageRefDTO | null;
  targetUrl?: string | null;
};

export type HomeHeroSectionDTO = SectionBase & {
  __component: "sections.home-hero";
  kicker?: string | null;
  heading: string;
  intro?: string | null;
  media?: MediaDTO | null;
  ctaLabel?: string | null;
  ctaTargetPage?: PageRefDTO | null;
  ctaUrl?: string | null;
};

export type LinkedResourceItemDTO = {
  title?: string | null;
  description?: string | null;
  image?: MediaDTO | null;
  targetPage?: PageRefDTO | null;
  targetUrl?: string | null;
};

export type SocialLinkItemDTO = {
  name: string;
  url: string;
  icon?: string | null;
};

export type VideoItemDTO = {
  title?: string | null;
  videoMp4?: MediaDTO | null;
  videoWebm?: MediaDTO | null;
  thumbnail?: MediaDTO | null;
  videoTags?: string | null;
};

export type AdvantageItemDTO = {
  title?: string | null;
  description?: string | null;
  icon?: string | null;
};

export type AccordionItemDTO = {
  title?: string | null;
  content?: string | null;
};

export type FaqItemDTO = {
  question?: string | null;
  answer?: string | null;
};

export type TabItemDTO = {
  title?: string | null;
  content?: string | null;
  link?: string | null;
};

export type GalleryItemDTO = {
  caption?: string | null;
  image?: MediaDTO | null;
};

export type HomeResourceGroupSectionDTO = SectionBase & {
  __component: "sections.home-resource-group";
  group: "operations" | "services";
  heading: string;
  items: LinkedResourceItemDTO[];
  viewAllTarget?: PageRefDTO | null;
  viewAllLabel?: string | null;
};

export type SectionDTO =
  | (SectionBase & { __component: "sections.promo-slider"; slides: PromoSlideItemDTO[] })
  | HomeHeroSectionDTO
  | HomeResourceGroupSectionDTO
  | (SectionBase & { __component: "sections.linked-resources"; items: LinkedResourceItemDTO[] })
  | (SectionBase & { __component: "sections.social-links"; links: SocialLinkItemDTO[] })
  | (SectionBase & { __component: "sections.video"; videos: VideoItemDTO[] })
  | (SectionBase & { __component: "sections.advantages"; items: AdvantageItemDTO[] })
  | (SectionBase & { __component: "sections.home-testimonials-teaser" })
  | (SectionBase & { __component: "sections.home-notice" })
  | (SectionBase & { __component: "sections.accordion"; items: AccordionItemDTO[] })
  | (SectionBase & { __component: "sections.faq"; items: FaqItemDTO[] })
  | (SectionBase & { __component: "sections.tabs"; items: TabItemDTO[] })
  | (SectionBase & { __component: "sections.gallery"; items: GalleryItemDTO[] })
  | (SectionBase & {
      __component: "sections.contact";
      details: ContactDetailDTO[];
      clinics: ContactClinicDTO[];
    })
  | (SectionBase & {
      __component: "sections.unknown";
      originalComponent: string;
    });

export type StrapiSectionRaw = {
  __component?: string | null;
  heading?: string | null;
  kicker?: string | null;
  intro?: string | null;
  media?: unknown;
  ctaLabel?: string | null;
  ctaTargetPage?: unknown;
  ctaUrl?: string | null;
  items?: unknown;
  slides?: unknown;
  links?: unknown;
  videos?: unknown;
  details?: unknown;
  clinics?: unknown;
  group?: unknown;
  viewAllTarget?: unknown;
  viewAllLabel?: unknown;
};
