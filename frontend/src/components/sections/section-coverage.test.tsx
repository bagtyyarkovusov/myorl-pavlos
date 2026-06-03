import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { SectionDTO, StrapiPagePayload } from "@/lib/cms/types";
import type { SectionComponent } from "@/lib/cms/types/sections";
import { toSemanticSections } from "@/lib/cms/section-normalizer";
import { SUPPORTED_SECTION_COMPONENTS } from "@/lib/sections/section-definitions";

import { DefaultSectionRenderer } from "./DefaultSectionRenderer";

function makePage(component: SectionComponent): StrapiPagePayload {
  return {
    documentId: `page-${component}`,
    locale: "el",
    slug: "coverage",
    title: "Coverage",
    pageType: "content",
    layoutVariant: "standard",
    pageSections: [makeRawSection(component)],
  };
}

function makeRawSection(component: SectionComponent) {
  const common = { __component: component, heading: "Coverage", intro: null };

  switch (component) {
    case "sections.promo-slider":
      return { ...common, slides: [{ title: "Slide", description: "<p>Text</p>" }] };
    case "sections.home-hero":
      return {
        ...common,
        kicker: "Kicker",
        ctaLabel: "Book",
        ctaUrl: "/el/rantevou",
      };
    case "sections.linked-resources":
      return { ...common, items: [{ title: "Resource", description: "<p>Text</p>" }] };
    case "sections.social-links":
      return { ...common, links: [{ name: "Facebook", url: "https://facebook.com" }] };
    case "sections.video":
      return {
        ...common,
        videos: [{ title: "Video", thumbnail: { url: "https://example.com/video.jpg" } }],
      };
    case "sections.advantages":
      return { ...common, items: [{ title: "Advantage", description: "<p>Text</p>" }] };
    case "sections.home-testimonials-teaser":
      return common;
    case "sections.home-notice":
      return { ...common, intro: "<p>Notice</p>" };
    case "sections.accordion":
      return { ...common, items: [{ title: "Topic", content: "<p>Body</p>" }] };
    case "sections.faq":
      return { ...common, items: [{ question: "Question", answer: "<p>Answer</p>" }] };
    case "sections.tabs":
      return { ...common, items: [{ title: "Tab", content: "<p>Panel</p>" }] };
    case "sections.gallery":
      return {
        ...common,
        items: [{ caption: "Image", image: { url: "https://example.com/image.jpg" } }],
      };
    case "sections.home-resource-group":
      return {
        ...common,
        group: "services",
        items: [{ title: "Resource", description: "<p>Text</p>" }],
      };
    case "sections.contact":
      return {
        ...common,
        details: [{ type: "Phone", value: "<p>+30 210 000</p>" }],
        clinics: [{ name: "Athens", address: "<p>123 Main St</p>" }],
      };
  }
}

describe("DynamicZone section coverage", () => {
  it("normalizes and renders every supported section definition", () => {
    for (const component of SUPPORTED_SECTION_COMPONENTS) {
      const [section] = toSemanticSections(makePage(component));
      expect(section?.__component).toBe(component);

      const { container, unmount } = render(
        <DefaultSectionRenderer section={section as SectionDTO} />,
      );
      expect(container.firstElementChild, component).toBeTruthy();
      unmount();
    }
  });
});
