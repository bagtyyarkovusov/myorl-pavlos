import { describe, expect, it } from "vitest";
import type { SectionComponent } from "@/lib/cms/types/sections";

import {
  SECTION_DEFINITIONS,
  SUPPORTED_SECTION_COMPONENTS,
  getSectionGridColumns,
  getSectionSchemaTypes,
  isSupportedSectionComponent,
} from "./section-definitions";

const SHARED_SECTION_COMPONENTS: SectionComponent[] = [
  "sections.promo-slider",
  "sections.home-hero",
  "sections.linked-resources",
  "sections.social-links",
  "sections.video",
  "sections.advantages",
  "sections.home-testimonials-teaser",
  "sections.home-notice",
  "sections.accordion",
  "sections.faq",
  "sections.tabs",
  "sections.gallery",
  "sections.contact",
];

describe("section definitions", () => {
  it("covers every shared DynamicZone section component", () => {
    expect(SUPPORTED_SECTION_COMPONENTS.toSorted()).toEqual(SHARED_SECTION_COMPONENTS.toSorted());
  });

  it("exposes grid defaults for every supported section", () => {
    for (const component of SHARED_SECTION_COMPONENTS) {
      expect(getSectionGridColumns(component)).toBeGreaterThanOrEqual(1);
      expect(getSectionGridColumns(component)).toBeLessThanOrEqual(4);
    }
  });

  it("keeps structured-data affordances near section ownership", () => {
    expect(getSectionSchemaTypes("sections.faq")).toEqual(["FAQPage"]);
    expect(getSectionSchemaTypes("sections.video")).toEqual(["VideoObject"]);
    expect(getSectionSchemaTypes("sections.gallery")).toEqual(["ImageObject"]);
    expect(getSectionSchemaTypes("sections.contact")).toEqual(["ContactPoint", "MedicalBusiness"]);
  });

  it("distinguishes supported and unsupported section components", () => {
    expect(isSupportedSectionComponent("sections.contact")).toBe(true);
    expect(isSupportedSectionComponent("blocks.future")).toBe(false);
    expect(getSectionSchemaTypes("blocks.future")).toEqual([]);
  });

  it("records explicit home adapter behavior for every supported section", () => {
    for (const component of SHARED_SECTION_COMPONENTS) {
      expect(SECTION_DEFINITIONS[component].homeAdapter).toBeTruthy();
    }
  });
});
