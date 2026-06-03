import type { SectionComponent } from "@/lib/cms/types/sections";

export type SectionSchemaType =
  | "FAQPage"
  | "VideoObject"
  | "ImageObject"
  | "ContactPoint"
  | "MedicalBusiness";

export type SectionHomeAdapter =
  | "default"
  | "hero"
  | "promo-carousel"
  | "advantages-band"
  | "video-theater"
  | "testimonials-teaser"
  | "notice"
  | "hidden";

export type SectionDefinition = {
  component: SectionComponent;
  gridColumns: 1 | 2 | 3 | 4;
  schemas: readonly SectionSchemaType[];
  homeAdapter: SectionHomeAdapter;
};

export const SECTION_DEFINITIONS = {
  "sections.promo-slider": {
    component: "sections.promo-slider",
    gridColumns: 2,
    schemas: [],
    homeAdapter: "promo-carousel",
  },
  "sections.home-hero": {
    component: "sections.home-hero",
    gridColumns: 1,
    schemas: [],
    homeAdapter: "hero",
  },
  "sections.linked-resources": {
    component: "sections.linked-resources",
    gridColumns: 3,
    schemas: [],
    homeAdapter: "default",
  },
  "sections.social-links": {
    component: "sections.social-links",
    gridColumns: 1,
    schemas: [],
    homeAdapter: "hidden",
  },
  "sections.video": {
    component: "sections.video",
    gridColumns: 2,
    schemas: ["VideoObject"],
    homeAdapter: "video-theater",
  },
  "sections.advantages": {
    component: "sections.advantages",
    gridColumns: 3,
    schemas: [],
    homeAdapter: "advantages-band",
  },
  "sections.home-testimonials-teaser": {
    component: "sections.home-testimonials-teaser",
    gridColumns: 1,
    schemas: [],
    homeAdapter: "testimonials-teaser",
  },
  "sections.home-notice": {
    component: "sections.home-notice",
    gridColumns: 1,
    schemas: [],
    homeAdapter: "notice",
  },
  "sections.accordion": {
    component: "sections.accordion",
    gridColumns: 1,
    schemas: [],
    homeAdapter: "default",
  },
  "sections.faq": {
    component: "sections.faq",
    gridColumns: 1,
    schemas: ["FAQPage"],
    homeAdapter: "default",
  },
  "sections.tabs": {
    component: "sections.tabs",
    gridColumns: 2,
    schemas: [],
    homeAdapter: "default",
  },
  "sections.gallery": {
    component: "sections.gallery",
    gridColumns: 3,
    schemas: ["ImageObject"],
    homeAdapter: "default",
  },
  "sections.contact": {
    component: "sections.contact",
    gridColumns: 1,
    schemas: ["ContactPoint", "MedicalBusiness"],
    homeAdapter: "hidden",
  },
} as const satisfies Record<SectionComponent, SectionDefinition>;

export const SUPPORTED_SECTION_COMPONENTS = Object.keys(SECTION_DEFINITIONS) as SectionComponent[];

export function isSupportedSectionComponent(value: string): value is SectionComponent {
  return value in SECTION_DEFINITIONS;
}

export function getSectionGridColumns(component: SectionComponent): 1 | 2 | 3 | 4 {
  return SECTION_DEFINITIONS[component].gridColumns;
}

export function getSectionSchemaTypes(component: string): readonly SectionSchemaType[] {
  return isSupportedSectionComponent(component) ? SECTION_DEFINITIONS[component].schemas : [];
}
