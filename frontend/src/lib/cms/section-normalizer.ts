import { normalizeOptionalText, optionalString } from "./text";
import type { ContactClinicDTO, StrapiClinic, StrapiContactDetail } from "./types";
import { isSupportedSectionComponent } from "@/lib/sections/section-definitions";
import type {
  AccordionItemDTO,
  AdvantageItemDTO,
  FaqItemDTO,
  GalleryItemDTO,
  LinkedResourceItemDTO,
  PromoSlideItemDTO,
  SectionDTO,
  SocialLinkItemDTO,
  StrapiSectionRaw,
  TabItemDTO,
  VideoItemDTO,
} from "./types/sections";
import { toMediaDTO, toPageRefDTO } from "./page-normalizer";
import type { StrapiMedia, StrapiPageRef, StrapiPagePayload } from "./types";

/**
 * Transforms raw Strapi `pageSections` into a typed {@link SectionDTO} array.
 *
 * Each dynamic-zone component is mapped to its corresponding DTO shape.
 *
 * @param page - Raw Strapi page payload.
 * @returns Ordered array of section DTOs (never `undefined`).
 */
export function toSemanticSections(page: StrapiPagePayload): SectionDTO[] {
  if (!Array.isArray(page.pageSections)) {
    return [];
  }
  return page.pageSections.map(toSectionDTO).filter((value): value is SectionDTO => value !== null);
}

export function toContactDetailDTO(detail: StrapiContactDetail) {
  return {
    type: (detail.type ?? "").trim(),
    valueHtml: detail.value ?? "",
  };
}

export function toContactClinicDTO(clinic: StrapiClinic): ContactClinicDTO | null {
  const name = normalizeOptionalText(clinic.name);
  const addressHtml = clinic.address ?? "";

  if (!name || !normalizeOptionalText(addressHtml)) return null;

  return {
    name,
    addressHtml,
    phone: clinic.phone ?? null,
    email: clinic.email ?? null,
    latitude: clinic.latitude ?? null,
    longitude: clinic.longitude ?? null,
  };
}

function toSectionDTO(raw: StrapiSectionRaw): SectionDTO | null {
  const rawComponent = normalizeOptionalText(raw.__component);
  const heading = normalizeOptionalText(raw.heading);
  const intro = normalizeOptionalText(raw.intro);

  if (!rawComponent) return null;

  if (!isSupportedSectionComponent(rawComponent)) {
    return {
      __component: "sections.unknown",
      originalComponent: rawComponent,
      heading,
      intro,
    };
  }

  const component = rawComponent;

  switch (component) {
    case "sections.promo-slider":
      return {
        __component: component,
        heading,
        intro,
        slides: toItemArray(raw.slides ?? raw.items, toPromoSlideItem),
      };
    case "sections.home-hero":
      return {
        __component: component,
        kicker: optionalString(raw.kicker),
        heading: heading ?? "",
        intro,
        media: toMediaDTO(raw.media as StrapiMedia | null | undefined, undefined),
        ctaLabel: optionalString(raw.ctaLabel),
        ctaTargetPage: toPageRefDTO(raw.ctaTargetPage as StrapiPageRef | null | undefined),
        ctaUrl: optionalString(raw.ctaUrl),
      };
    case "sections.linked-resources":
      return {
        __component: component,
        heading,
        intro,
        items: toItemArray(raw.items, toLinkedResourceItem),
      };
    case "sections.social-links":
      return {
        __component: component,
        heading,
        intro,
        links: toItemArray(raw.links ?? raw.items, toSocialLinkItem),
      };
    case "sections.video":
      return {
        __component: component,
        heading,
        intro,
        videos: toItemArray(raw.videos ?? raw.items, toVideoItem),
      };
    case "sections.advantages":
      return {
        __component: component,
        heading,
        intro,
        items: toItemArray(raw.items, toAdvantageItem),
      };
    case "sections.home-resource-group":
      return {
        __component: component,
        group: (raw.group as "operations" | "services") ?? "services",
        heading: heading ?? "",
        intro,
        items: toItemArray(raw.items, toLinkedResourceItem),
        viewAllTarget: toPageRefDTO(raw.viewAllTarget as StrapiPageRef | null | undefined),
        viewAllLabel: optionalString(raw.viewAllLabel),
      };
    case "sections.home-testimonials-teaser":
      return {
        __component: component,
        heading,
        intro,
      };
    case "sections.home-notice":
      return {
        __component: component,
        heading,
        intro,
      };
    case "sections.accordion":
      return {
        __component: component,
        heading,
        intro,
        items: toItemArray(raw.items, toAccordionItem),
      };
    case "sections.faq":
      return {
        __component: component,
        heading,
        intro,
        items: toItemArray(raw.items, toFaqItem),
      };
    case "sections.tabs":
      return {
        __component: component,
        heading,
        intro,
        items: toItemArray(raw.items, toTabItem),
      };
    case "sections.gallery":
      return {
        __component: component,
        heading,
        intro,
        items: toItemArray(raw.items, toGalleryItem),
      };
    case "sections.contact":
      return {
        __component: component,
        heading,
        intro,
        details: toItemArray(raw.details, toContactDetailDTO),
        clinics: toItemArray(raw.clinics, toContactClinicDTO).filter(
          (value): value is ContactClinicDTO => value !== null,
        ),
      };
    default:
      return null;
  }
}

function toItemArray<T>(value: unknown, mapItem: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map(mapItem);
}

function toPromoSlideItem(raw: Record<string, unknown>): PromoSlideItemDTO {
  const targetPage = raw.targetPage as Record<string, unknown> | null | undefined;

  return {
    title: optionalString(raw.title),
    description: optionalString(raw.description),
    targetPageExcerpt: optionalString(targetPage?.excerpt),
    image: toMediaDTO(raw.image as StrapiMedia | null | undefined, undefined),
    targetPage: toPageRefDTO(raw.targetPage as StrapiPageRef | null | undefined),
    targetUrl: optionalString(raw.targetUrl),
  };
}

function toLinkedResourceItem(raw: Record<string, unknown>): LinkedResourceItemDTO {
  const targetPage = raw.targetPage as Record<string, unknown> | null | undefined;

  return {
    title: optionalString(raw.title),
    description: optionalString(raw.description),
    image:
      toMediaDTO(targetPage?.imageCenter as StrapiMedia | null | undefined, undefined) ??
      toMediaDTO(targetPage?.featuredImage as StrapiMedia | null | undefined, undefined),
    targetPage: toPageRefDTO(raw.targetPage as StrapiPageRef | null | undefined),
    targetUrl: optionalString(raw.targetUrl),
  };
}

function toSocialLinkItem(raw: Record<string, unknown>): SocialLinkItemDTO {
  return {
    name: optionalString(raw.name) ?? "",
    url: optionalString(raw.url) ?? "",
    icon: optionalString(raw.icon),
  };
}

function toVideoItem(raw: Record<string, unknown>): VideoItemDTO {
  return {
    title: optionalString(raw.title),
    videoMp4: toMediaDTO(raw.videoMp4 as StrapiMedia | null | undefined, undefined),
    videoWebm: toMediaDTO(raw.videoWebm as StrapiMedia | null | undefined, undefined),
    thumbnail: toMediaDTO(raw.thumbnail as StrapiMedia | null | undefined, undefined),
    videoTags: optionalString(raw.videoTags),
  };
}

function toAdvantageItem(raw: Record<string, unknown>): AdvantageItemDTO {
  return {
    title: optionalString(raw.title),
    description: optionalString(raw.description),
    icon: optionalString(raw.icon),
  };
}

function toAccordionItem(raw: Record<string, unknown>): AccordionItemDTO {
  return {
    title: optionalString(raw.title),
    content: optionalString(raw.content),
  };
}

function toFaqItem(raw: Record<string, unknown>): FaqItemDTO {
  return {
    question: optionalString(raw.question),
    answer: optionalString(raw.answer),
  };
}

function toTabItem(raw: Record<string, unknown>): TabItemDTO {
  return {
    title: optionalString(raw.title),
    content: optionalString(raw.content),
    link: optionalString(raw.link),
  };
}

function toGalleryItem(raw: Record<string, unknown>): GalleryItemDTO {
  return {
    caption: optionalString(raw.caption),
    image: toMediaDTO(raw.image as StrapiMedia | null | undefined, undefined),
  };
}
