import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { SectionDTO } from "@/lib/cms/types";

import { DefaultSectionRenderer } from "./DefaultSectionRenderer";

function makeSection(overrides: Partial<SectionDTO> = {}): SectionDTO {
  return {
    __component: "sections.faq",
    heading: null,
    intro: null,
    items: [],
    ...overrides,
  } as SectionDTO;
}

describe("DefaultSectionRenderer", () => {
  it("renders a promo-slider section", () => {
    const section = makeSection({
      __component: "sections.promo-slider",
      heading: "Featured",
      slides: [{ title: "Slide 1", description: "<p>Desc</p>", image: null, targetPage: null, targetUrl: null }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("renders a linked-resources section", () => {
    const section = makeSection({
      __component: "sections.linked-resources",
      heading: "Resources",
      items: [{ title: "Resource 1", description: "<p>Text</p>", targetPage: null, targetUrl: null }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("renders a social-links section", () => {
    const section = makeSection({
      __component: "sections.social-links",
      heading: "Social",
      links: [{ name: "Facebook", url: "https://fb.com", icon: null }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("ul")).toBeTruthy();
  });

  it("renders a video section", () => {
    const section = makeSection({
      __component: "sections.video",
      heading: "Videos",
      videos: [{ title: "Video 1", videoMp4: null, videoWebm: null, thumbnail: null, videoTags: null }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("renders an advantages section", () => {
    const section = makeSection({
      __component: "sections.advantages",
      heading: "Advantages",
      items: [{ title: "Adv 1", description: "<p>Text</p>", icon: null }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("renders an accordion section", () => {
    const section = makeSection({
      __component: "sections.accordion",
      heading: "Accordion",
      items: [{ title: "Item 1", content: "<p>Content</p>" }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("details")).toBeTruthy();
  });

  it("renders a faq section", () => {
    const section = makeSection({
      __component: "sections.faq",
      heading: "FAQ",
      items: [{ question: "Q1", answer: "<p>A1</p>" }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("details")).toBeTruthy();
  });

  it("renders a tabs section", () => {
    const section = makeSection({
      __component: "sections.tabs",
      heading: "Tabs",
      items: [{ title: "Tab 1", content: "<p>Content</p>", link: null }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("renders a gallery section", () => {
    const section = makeSection({
      __component: "sections.gallery",
      heading: "Gallery",
      items: [{ caption: "Image 1", image: null }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("renders a contact section", () => {
    const section = makeSection({
      __component: "sections.contact",
      heading: "Contact",
      details: [{ type: "Phone", valueHtml: "<p>123</p>" }],
      clinics: [],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("returns null for unknown components", () => {
    const section = makeSection({
      __component: "sections.unknown",
    } as unknown as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("section")).toBeFalsy();
  });

  it("wraps advantages in a 3-column SectionGrid", () => {
    const section = makeSection({
      __component: "sections.advantages",
      heading: "Advantages",
      items: [
        { title: "A1", description: "<p>D1</p>", icon: null },
        { title: "A2", description: "<p>D2</p>", icon: null },
      ],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("cols-3");
  });

  it("wraps faq in a 1-column SectionGrid", () => {
    const section = makeSection({
      __component: "sections.faq",
      heading: "FAQ",
      items: [{ question: "Q1", answer: "<p>A1</p>" }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("cols-1");
  });

  it("wraps video in a 2-column SectionGrid", () => {
    const section = makeSection({
      __component: "sections.video",
      heading: "Videos",
      videos: [{ title: "V1", videoMp4: null, videoWebm: null, thumbnail: null, videoTags: null }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("cols-2");
  });

  it("renders FAQ disclosure items with a chevron indicator", () => {
    const section = makeSection({
      __component: "sections.faq",
      heading: "FAQ",
      items: [{ question: "Q1", answer: "<p>A1</p>" }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    const details = container.querySelector("details");
    expect(details).toBeTruthy();
    const summary = details!.querySelector("summary");
    expect(summary).toBeTruthy();
    const chevron = summary!.querySelector("[data-chevron]");
    expect(chevron).toBeTruthy();
  });

  it("renders accordion disclosure items with a chevron indicator", () => {
    const section = makeSection({
      __component: "sections.accordion",
      heading: "Accordion",
      items: [{ title: "Item 1", content: "<p>Content</p>" }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    const summary = container.querySelector("summary");
    expect(summary).toBeTruthy();
    const chevron = summary!.querySelector("[data-chevron]");
    expect(chevron).toBeTruthy();
  });
});
