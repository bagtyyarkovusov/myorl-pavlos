import { describe, expect, it } from "vitest";

import { getSectionSchemas } from "./seo-schema-map";
import type { SectionDTO } from "@/lib/cms/types";

function makeSection(component: string): SectionDTO {
  return { __component: component, heading: null, intro: null } as SectionDTO;
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
