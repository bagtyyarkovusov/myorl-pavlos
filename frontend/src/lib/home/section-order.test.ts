import { describe, expect, it } from "vitest";

import {
  sortHomeSections,
  INJECTED_MENU_ACCESS_GRID,
  INJECTED_TESTIMONIALS_TEASER,
  INJECTED_VISIT_MAP,
  type InjectedMarker,
} from "./section-order";
import type { SectionDTO } from "@/lib/cms/types";

function makeSection(component: string, heading?: string): SectionDTO {
  return { __component: component, heading: heading ?? null } as SectionDTO;
}

function isInjected(entry: SectionDTO | InjectedMarker): entry is InjectedMarker {
  return "__injected" in entry;
}

function componentNames(entries: (SectionDTO | InjectedMarker)[]): string[] {
  return entries.map((e) => (isInjected(e) ? e.__injected : e.__component));
}

describe("sortHomeSections", () => {
  it("sorts sections into canonical order", () => {
    const sections: SectionDTO[] = [
      makeSection("sections.contact"),
      makeSection("sections.video"),
      makeSection("sections.promo-slider"),
      makeSection("sections.advantages"),
      makeSection("sections.linked-resources"),
    ];

    const result = sortHomeSections(sections);
    const names = componentNames(result);

    expect(names).toEqual([
      "sections.promo-slider",
      INJECTED_MENU_ACCESS_GRID,
      "sections.advantages",
      "sections.linked-resources",
      "sections.video",
      INJECTED_TESTIMONIALS_TEASER,
      "sections.contact",
      INJECTED_VISIT_MAP,
    ]);
  });

  it("skips missing sections without gaps", () => {
    const sections: SectionDTO[] = [
      makeSection("sections.promo-slider"),
      makeSection("sections.contact"),
    ];

    const result = sortHomeSections(sections);
    const names = componentNames(result);

    expect(names).toEqual([
      "sections.promo-slider",
      INJECTED_MENU_ACCESS_GRID,
      "sections.contact",
      INJECTED_VISIT_MAP,
    ]);
    expect(names).not.toContain("sections.advantages");
    expect(names).not.toContain("sections.video");
  });

  it("appends unknown section types at the end in original order", () => {
    const sections: SectionDTO[] = [
      makeSection("sections.social-links"),
      makeSection("sections.promo-slider"),
      makeSection("sections.gallery"),
    ];

    const result = sortHomeSections(sections);
    const names = componentNames(result);

    expect(names.indexOf("sections.social-links")).toBeGreaterThan(
      names.indexOf(INJECTED_VISIT_MAP),
    );
    expect(names.indexOf("sections.gallery")).toBeGreaterThan(
      names.indexOf("sections.social-links"),
    );
  });

  it("returns only injected markers for empty sections array", () => {
    const result = sortHomeSections([]);
    const names = componentNames(result);

    expect(names).toEqual([INJECTED_VISIT_MAP]);
  });

  it("injects MenuAccessGrid only when promo-slider is present", () => {
    const withPromo = sortHomeSections([makeSection("sections.promo-slider")]);
    const withoutPromo = sortHomeSections([makeSection("sections.video")]);

    expect(componentNames(withPromo)).toContain(INJECTED_MENU_ACCESS_GRID);
    expect(componentNames(withoutPromo)).not.toContain(INJECTED_MENU_ACCESS_GRID);
  });

  it("injects TestimonialsTeaser only when video section is present", () => {
    const withVideo = sortHomeSections([makeSection("sections.video")]);
    const withoutVideo = sortHomeSections([makeSection("sections.contact")]);

    expect(componentNames(withVideo)).toContain(INJECTED_TESTIMONIALS_TEASER);
    expect(componentNames(withoutVideo)).not.toContain(INJECTED_TESTIMONIALS_TEASER);
  });

  it("always appends visit-map at the end", () => {
    const result = sortHomeSections([makeSection("sections.contact")]);
    const names = componentNames(result);

    expect(names[names.length - 1]).toBe(INJECTED_VISIT_MAP);
  });

  it("preserves original order for multiple unknown sections", () => {
    const sections: SectionDTO[] = [
      makeSection("sections.gallery"),
      makeSection("sections.accordion"),
      makeSection("sections.social-links"),
    ];

    const result = sortHomeSections(sections);
    const names = componentNames(result);

    const galleryIdx = names.indexOf("sections.gallery");
    const accordionIdx = names.indexOf("sections.accordion");
    const socialIdx = names.indexOf("sections.social-links");

    expect(galleryIdx).toBeLessThan(accordionIdx);
    expect(accordionIdx).toBeLessThan(socialIdx);
  });
});
