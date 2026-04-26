import { toMediaDTO } from "./media";
import { toPageRefDTO } from "./references";
import { optionalString, normalizeOptionalText } from "./text";
import type {
  AccordionItemDTO,
  AdvantageItemDTO,
  FaqItemDTO,
  GalleryItemDTO,
  LinkedResourceItemDTO,
  PromoSlideItemDTO,
  SectionComponent,
  SectionDTO,
  SocialLinkItemDTO,
  StrapiSectionRaw,
  TabItemDTO,
  VideoItemDTO,
} from "./sections";
import type {
  ContactClinicDTO,
  StrapiClinic,
  StrapiContactDetail,
  StrapiMedia,
  StrapiPagePayload,
  StrapiPageRef,
} from "./types";

const KNOWN_SECTION_COMPONENTS: ReadonlySet<SectionComponent> = new Set<SectionComponent>([
  "sections.promo-slider",
  "sections.linked-resources",
  "sections.social-links",
  "sections.video",
  "sections.advantages",
  "sections.accordion",
  "sections.faq",
  "sections.tabs",
  "sections.gallery",
  "sections.contact",
]);

export function toSemanticSections(page: StrapiPagePayload): SectionDTO[] {
  const collected: Array<StrapiSectionRaw & { __component?: string | null }> = [];

  if (page.pageType === "home" && Array.isArray(page.pageSections)) {
    collected.push(...page.pageSections);
  }

  pushIfPresent(collected, page.faqSection, "sections.faq");
  pushIfPresent(collected, page.accordionSection, "sections.accordion");
  pushIfPresent(collected, page.tabsSection, "sections.tabs");
  pushIfPresent(collected, page.gallerySection, "sections.gallery");

  if (page.contactSection) {
    collected.push({ ...page.contactSection, __component: "sections.contact" });
  }

  return collected.map(toSectionDTO).filter((value): value is SectionDTO => value !== null);
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

  if (!name || !normalizeOptionalText(addressHtml)) {
    return null;
  }

  return {
    name,
    addressHtml,
    phone: clinic.phone ?? null,
    email: clinic.email ?? null,
  };
}

function pushIfPresent(
  acc: Array<StrapiSectionRaw & { __component?: string | null }>,
  raw: StrapiSectionRaw | null | undefined,
  fallbackComponent: SectionComponent,
): void {
  if (!raw) {
    return;
  }
  acc.push({ ...raw, __component: raw.__component ?? fallbackComponent });
}

function toSectionDTO(raw: StrapiSectionRaw): SectionDTO | null {
  const component = (raw.__component ?? "") as SectionComponent;
  if (!KNOWN_SECTION_COMPONENTS.has(component)) {
    return null;
  }

  const heading = normalizeOptionalText(raw.heading);
  const intro = normalizeOptionalText(raw.intro);

  switch (component) {
    case "sections.promo-slider":
      return {
        __component: component,
        heading,
        intro,
        slides: toItemArray(raw.slides ?? raw.items, toPromoSlideItem),
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
  }
}

function toItemArray<T>(value: unknown, mapItem: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map(mapItem);
}

function toPromoSlideItem(raw: Record<string, unknown>): PromoSlideItemDTO {
  return {
    title: optionalString(raw.title),
    description: optionalString(raw.description),
    image: toMediaDTO(raw.image as StrapiMedia | null | undefined),
    targetPage: toPageRefDTO(raw.targetPage as StrapiPageRef | null | undefined),
    targetUrl: optionalString(raw.targetUrl),
  };
}

function toLinkedResourceItem(raw: Record<string, unknown>): LinkedResourceItemDTO {
  return {
    title: optionalString(raw.title),
    description: optionalString(raw.description),
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
    videoMp4: toMediaDTO(raw.videoMp4 as StrapiMedia | null | undefined),
    videoWebm: toMediaDTO(raw.videoWebm as StrapiMedia | null | undefined),
    thumbnail: toMediaDTO(raw.thumbnail as StrapiMedia | null | undefined),
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
    image: toMediaDTO(raw.image as StrapiMedia | null | undefined),
  };
}
