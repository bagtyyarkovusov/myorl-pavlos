import { describe, expect, it } from "vitest";

import {
  HOME_ALLOWED_SECTION_COMPONENTS,
  validatePageSectionsForLayout,
} from "../home-section-policy";

describe("home section policy", () => {
  it("allows only the canonical home section set", () => {
    expect(HOME_ALLOWED_SECTION_COMPONENTS).toEqual([
      "sections.home-hero",
      "sections.promo-slider",
      "sections.advantages",
      "sections.linked-resources",
      "sections.home-resource-group",
      "sections.video",
      "sections.home-testimonials-teaser",
      "sections.home-notice",
    ]);
  });

  it("accepts the approved home components", () => {
    for (const component of HOME_ALLOWED_SECTION_COMPONENTS) {
      expect(() =>
        validatePageSectionsForLayout({
          layoutVariant: "home",
          pageSections: [{ __component: component }],
        }),
      ).not.toThrow();
    }
  });

  it("rejects the legacy linked resources section when home resource groups are present", () => {
    expect(() =>
      validatePageSectionsForLayout({
        layoutVariant: "home",
        pageSections: [
          { __component: "sections.linked-resources" },
          { __component: "sections.home-resource-group" },
        ],
      }),
    ).toThrow(
      "Home pages cannot combine sections.linked-resources with sections.home-resource-group",
    );
  });

  it("rejects contact, social, FAQ, accordion, tabs, and gallery sections on home", () => {
    for (const component of [
      "sections.contact",
      "sections.social-links",
      "sections.faq",
      "sections.accordion",
      "sections.tabs",
      "sections.gallery",
    ]) {
      expect(() =>
        validatePageSectionsForLayout({
          layoutVariant: "home",
          pageSections: [{ __component: component }],
        }),
      ).toThrow(`Home pages cannot use ${component}`);
    }
  });
});
