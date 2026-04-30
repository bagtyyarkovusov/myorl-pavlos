import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { SectionDTO } from "@/lib/cms/types";

import { HomeSectionRenderer } from "./HomeSectionRenderer";

function makeSection(overrides: Partial<SectionDTO> = {}): SectionDTO {
  return {
    __component: "sections.faq",
    heading: null,
    intro: null,
    items: [],
    ...overrides,
  } as SectionDTO;
}

describe("HomeSectionRenderer", () => {
  it("renders a home social-links section", () => {
    const section = makeSection({
      __component: "sections.social-links",
      heading: "Follow Us",
      links: [{ name: "Facebook", url: "https://fb.com", icon: null }],
    } as SectionDTO);

    const { container } = render(<HomeSectionRenderer section={section} locale="el" />);
    expect(container.querySelector("ul")).toBeTruthy();
  });

  it("renders a home contact section", () => {
    const section = makeSection({
      __component: "sections.contact",
      heading: "Home Contact",
      details: [{ type: "Phone", valueHtml: "<p>123</p>" }],
      clinics: [{ name: "Clinic A", addressHtml: "<p>Address</p>", phone: null, email: null }],
    } as SectionDTO);

    const { container } = render(<HomeSectionRenderer section={section} locale="el" />);
    expect(container.querySelector('[class*="home-contact"]')).toBeTruthy();
  });

  it("falls through to DefaultSectionRenderer for unknown components", () => {
    const section = makeSection({
      __component: "sections.faq",
      heading: "FAQ",
      items: [{ question: "Q1", answer: "<p>A1</p>" }],
    } as SectionDTO);

    const { container } = render(<HomeSectionRenderer section={section} locale="el" />);
    expect(container.querySelector("details")).toBeTruthy();
  });
});
