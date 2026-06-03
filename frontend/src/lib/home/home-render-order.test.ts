import { describe, expect, it } from "vitest";
import type { SectionDTO } from "@/lib/cms/types";

import { getHomeRenderItemKey, orderHomeRenderItems } from "./home-render-order";

function makeSection(component: SectionDTO["__component"], heading: string): SectionDTO {
  return {
    __component: component,
    heading,
    intro: null,
    slides: [],
    items: [],
    links: [],
    videos: [],
    details: [],
    clinics: [],
    originalComponent: component,
  } as SectionDTO;
}

function labelsFor(sections: SectionDTO[]) {
  return orderHomeRenderItems(sections).map((item) => {
    if (item.kind === "section")
      return `${item.kind}:${item.section.__component}:${item.section.heading}`;
    if (item.kind === "home-advantages") {
      return `${item.kind}:${item.section.heading}`;
    }
    return item.kind;
  });
}

describe("orderHomeRenderItems", () => {
  it("returns the agreed homepage composition regardless of CMS section order", () => {
    const result = labelsFor([
      makeSection("sections.video", "Video"),
      makeSection("sections.home-testimonials-teaser", "Testimonials"),
      makeSection("sections.linked-resources", "Links"),
      makeSection("sections.advantages", "Advantages"),
      makeSection("sections.promo-slider", "Promo"),
    ]);

    expect(result).toEqual([
      "section:sections.promo-slider:Promo",
      "menu-access-grid",
      "home-advantages:Advantages",
      "section:sections.linked-resources:Links",
      "home-testimonials",
      "section:sections.video:Video",
      "home-visit-map",
    ]);
  });

  it("omits dependent injected blocks when their anchor sections are missing", () => {
    expect(labelsFor([])).toEqual(["home-visit-map"]);

    expect(labelsFor([makeSection("sections.promo-slider", "Promo")])).toEqual([
      "section:sections.promo-slider:Promo",
      "menu-access-grid",
      "home-visit-map",
    ]);
  });

  it("groups duplicate known sections deterministically while preserving relative order", () => {
    const result = labelsFor([
      makeSection("sections.linked-resources", "Links A"),
      makeSection("sections.promo-slider", "Promo A"),
      makeSection("sections.linked-resources", "Links B"),
      makeSection("sections.promo-slider", "Promo B"),
      makeSection("sections.home-testimonials-teaser", "Testimonials"),
    ]);

    expect(result).toEqual([
      "section:sections.promo-slider:Promo A",
      "section:sections.promo-slider:Promo B",
      "menu-access-grid",
      "section:sections.linked-resources:Links A",
      "section:sections.linked-resources:Links B",
      "home-testimonials",
      "home-visit-map",
    ]);
  });

  it("appends unknown and unlisted sections in their original CMS order", () => {
    const result = labelsFor([
      makeSection("sections.unknown", "Unknown A"),
      makeSection("sections.faq", "FAQ"),
      makeSection("sections.promo-slider", "Promo"),
      makeSection("sections.unknown", "Unknown B"),
    ]);

    expect(result).toEqual([
      "section:sections.promo-slider:Promo",
      "menu-access-grid",
      "section:sections.unknown:Unknown A",
      "section:sections.faq:FAQ",
      "section:sections.unknown:Unknown B",
      "home-visit-map",
    ]);
  });

  it("builds stable keys for duplicate CMS sections and injected blocks", () => {
    const result = orderHomeRenderItems([
      makeSection("sections.promo-slider", "Promo A"),
      makeSection("sections.promo-slider", "Promo B"),
    ]);

    expect(result.map(getHomeRenderItemKey)).toEqual([
      "sections.promo-slider-0",
      "sections.promo-slider-1",
      "menu-access-grid",
      "home-visit-map",
    ]);
  });
});
