import { describe, expect, it } from "vitest";

import { getPageSchemas, getSectionSchemas } from "./seo-schema-map";
import type { LayoutVariant, PageType } from "@myorl-pavlos/shared-types";
import type { SectionDTO } from "@/lib/cms/types";

function makeSection(component: string): SectionDTO {
  return { __component: component, heading: null, intro: null } as SectionDTO;
}

function makePage(
  overrides: {
    pageType?: PageType;
    sections?: SectionDTO[];
    slug?: string;
    layoutVariant?: LayoutVariant;
  } = {},
) {
  return {
    pageType: "content" as PageType,
    sections: [] as SectionDTO[],
    slug: "test",
    layoutVariant: "standard" as LayoutVariant,
    ...overrides,
  };
}

describe("getSectionSchemas", () => {
  it("returns FAQPage for faq sections", () => {
    const sections = [makeSection("sections.faq")];
    const schemas = getSectionSchemas(sections);
    expect(schemas).toContain("FAQPage");
  });

  it("returns VideoObject for video sections", () => {
    const sections = [makeSection("sections.video")];
    const schemas = getSectionSchemas(sections);
    expect(schemas).toContain("VideoObject");
  });

  it("returns ImageObject for gallery sections", () => {
    const sections = [makeSection("sections.gallery")];
    const schemas = getSectionSchemas(sections);
    expect(schemas).toContain("ImageObject");
  });

  it("returns ContactPoint for contact sections", () => {
    const sections = [makeSection("sections.contact")];
    const schemas = getSectionSchemas(sections);
    expect(schemas).toContain("ContactPoint");
  });

  it("returns empty array for sections without schema mapping", () => {
    const sections = [makeSection("sections.promo-slider"), makeSection("sections.advantages")];
    const schemas = getSectionSchemas(sections);
    expect(schemas).toEqual([]);
  });

  it("deduplicates schema types across multiple sections", () => {
    const sections = [makeSection("sections.faq"), makeSection("sections.faq")];
    const schemas = getSectionSchemas(sections);
    const faqCount = schemas.filter((s) => s === "FAQPage").length;
    expect(faqCount).toBe(1);
  });

  it("returns combined schemas for mixed sections", () => {
    const sections = [
      makeSection("sections.faq"),
      makeSection("sections.video"),
      makeSection("sections.gallery"),
      makeSection("sections.contact"),
      makeSection("sections.advantages"),
    ];
    const schemas = getSectionSchemas(sections);
    expect(schemas).toContain("FAQPage");
    expect(schemas).toContain("VideoObject");
    expect(schemas).toContain("ImageObject");
    expect(schemas).toContain("ContactPoint");
    expect(schemas).not.toContain("AdvantagesObject");
  });
});

describe("getPageSchemas", () => {
  it("returns Physician for viografiko slug", () => {
    const schemas = getPageSchemas(makePage({ slug: "viografiko" }));
    expect(schemas).toContain("Physician");
  });

  it("does not return Physician for other slugs", () => {
    const schemas = getPageSchemas(makePage({ slug: "yperesies" }));
    expect(schemas).not.toContain("Physician");
  });

  it("returns MedicalProcedure for service-article layoutVariant", () => {
    const schemas = getPageSchemas(makePage({ layoutVariant: "service-article" }));
    expect(schemas).toContain("MedicalProcedure");
  });

  it("returns MedicalProcedure for service-faq layoutVariant", () => {
    const schemas = getPageSchemas(makePage({ layoutVariant: "service-faq" }));
    expect(schemas).toContain("MedicalProcedure");
  });

  it("returns MedicalProcedure for service-accordion layoutVariant", () => {
    const schemas = getPageSchemas(makePage({ layoutVariant: "service-accordion" }));
    expect(schemas).toContain("MedicalProcedure");
  });

  it("returns MedicalProcedure for service-tabs layoutVariant", () => {
    const schemas = getPageSchemas(makePage({ layoutVariant: "service-tabs" }));
    expect(schemas).toContain("MedicalProcedure");
  });

  it("returns MedicalCondition for encyclopedia-article layoutVariant", () => {
    const schemas = getPageSchemas(makePage({ layoutVariant: "encyclopedia-article" }));
    expect(schemas).toContain("MedicalCondition");
  });

  it("returns Article for specialized-article layoutVariant", () => {
    const schemas = getPageSchemas(makePage({ layoutVariant: "specialized-article" }));
    expect(schemas).toContain("Article");
  });

  it("returns no layoutVariant schemas for standard layoutVariant", () => {
    const schemas = getPageSchemas(makePage({ layoutVariant: "standard" }));
    const variantTypes = ["MedicalProcedure", "MedicalCondition", "Article", "Physician"];
    for (const t of variantTypes) {
      expect(schemas).not.toContain(t);
    }
  });

  it("returns MedicalBusiness for home pageType", () => {
    const schemas = getPageSchemas(makePage({ pageType: "home" }));
    expect(schemas).toContain("MedicalBusiness");
  });

  it("combines layoutVariant, slug, and section schemas", () => {
    const sections = [makeSection("sections.faq")];
    const schemas = getPageSchemas(
      makePage({
        slug: "viografiko",
        layoutVariant: "service-article",
        sections,
      }),
    );
    expect(schemas).toContain("Physician");
    expect(schemas).toContain("MedicalProcedure");
    expect(schemas).toContain("FAQPage");
  });
});
