import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
      slides: [
        {
          title: "Slide 1",
          description: "<p>Desc</p>",
          image: null,
          targetPage: null,
          targetUrl: null,
        },
      ],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("renders a linked-resources section", () => {
    const section = makeSection({
      __component: "sections.linked-resources",
      heading: "Resources",
      items: [
        { title: "Resource 1", description: "<p>Text</p>", targetPage: null, targetUrl: null },
      ],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("article[data-card]")).toBeTruthy();
  });

  it("renders linked-resources with density-aware cards", () => {
    const section = makeSection({
      __component: "sections.linked-resources",
      heading: "Resources",
      items: [
        {
          title: "Resource 1",
          description: "<p>Text</p>",
          targetPage: null,
          targetUrl: "/el/resource-1",
        },
      ],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} density="theater" />);
    const card = container.querySelector("article[data-card]");
    expect(card?.getAttribute("data-density")).toBe("theater");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/el/resource-1");
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
      videos: [
        { title: "Video 1", videoMp4: null, videoWebm: null, thumbnail: null, videoTags: null },
      ],
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

    render(<DefaultSectionRenderer section={section} />);
    expect(screen.getByRole("button", { name: "Item 1" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("renders a faq section", () => {
    const section = makeSection({
      __component: "sections.faq",
      heading: "FAQ",
      items: [{ question: "Q1", answer: "<p>A1</p>" }],
    } as SectionDTO);

    render(<DefaultSectionRenderer section={section} />);
    expect(screen.getByRole("button", { name: "Q1" })).toHaveAttribute("aria-expanded", "false");
  });

  it("renders a tabs section", () => {
    const section = makeSection({
      __component: "sections.tabs",
      heading: "Tabs",
      items: [{ title: "Tab 1", content: "<p>Content</p>", link: null }],
    } as SectionDTO);

    const { container } = render(<DefaultSectionRenderer section={section} />);
    expect(container.querySelector("[role='tablist']")).toBeTruthy();
  });

  it("renders tabs with tablist semantics and aria-selected state", () => {
    const section = makeSection({
      __component: "sections.tabs",
      heading: "Tabs",
      items: [
        { title: "Diagnosis", content: "<p>Diagnosis content</p>", link: null },
        { title: "Treatment", content: "<p>Treatment content</p>", link: null },
      ],
    } as SectionDTO);

    render(<DefaultSectionRenderer section={section} />);

    expect(screen.getByRole("tablist")).toBeTruthy();
    const diagnosis = screen.getByRole("tab", { name: "Diagnosis" });
    const treatment = screen.getByRole("tab", { name: "Treatment" });
    expect(diagnosis).toHaveAttribute("aria-selected", "true");
    expect(treatment).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Diagnosis content");

    fireEvent.click(treatment);

    expect(diagnosis).toHaveAttribute("aria-selected", "false");
    expect(treatment).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Treatment content");
  });

  it("supports keyboard navigation between desktop tabs", () => {
    const section = makeSection({
      __component: "sections.tabs",
      heading: "Tabs",
      items: [
        { title: "Diagnosis", content: "<p>Diagnosis content</p>", link: null },
        { title: "Treatment", content: "<p>Treatment content</p>", link: null },
      ],
    } as SectionDTO);

    render(<DefaultSectionRenderer section={section} />);

    const diagnosis = screen.getByRole("tab", { name: "Diagnosis" });
    const treatment = screen.getByRole("tab", { name: "Treatment" });

    fireEvent.keyDown(diagnosis, { key: "ArrowRight" });

    expect(diagnosis).toHaveAttribute("aria-selected", "false");
    expect(treatment).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Treatment content");
  });

  it("also renders tabs as accordion disclosures for mobile", () => {
    const section = makeSection({
      __component: "sections.tabs",
      heading: "Tabs",
      items: [
        { title: "Diagnosis", content: "<p>Diagnosis content</p>", link: null },
        { title: "Treatment", content: "<p>Treatment content</p>", link: null },
      ],
    } as SectionDTO);

    render(<DefaultSectionRenderer section={section} />);

    const mobileTabs = screen.getByTestId("tabs-mobile-accordion");
    const treatment = within(mobileTabs).getByRole("button", { name: "Treatment" });
    expect(treatment).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(treatment);

    expect(treatment).toHaveAttribute("aria-expanded", "true");
    expect(within(mobileTabs).getByText("Treatment content").closest(".prose-luxury")).toBeTruthy();
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

    render(<DefaultSectionRenderer section={section} />);
    const trigger = screen.getByRole("button", { name: "Q1" });
    const chevron = trigger.querySelector("[data-chevron]");
    expect(chevron).toBeTruthy();
  });

  it("toggles FAQ rows with aria-expanded and prose-luxury content", () => {
    const section = makeSection({
      __component: "sections.faq",
      heading: "FAQ",
      items: [{ question: "Q1", answer: "<p>A1</p>" }],
    } as SectionDTO);

    render(<DefaultSectionRenderer section={section} />);

    const trigger = screen.getByRole("button", { name: "Q1" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.closest("[data-state]")).toHaveAttribute("data-state", "closed");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger.closest("[data-state]")).toHaveAttribute("data-state", "open");
    expect(screen.getByText("A1").closest(".prose-luxury")).toBeTruthy();
  });

  it("renders accordion disclosure items with a chevron indicator", () => {
    const section = makeSection({
      __component: "sections.accordion",
      heading: "Accordion",
      items: [{ title: "Item 1", content: "<p>Content</p>" }],
    } as SectionDTO);

    render(<DefaultSectionRenderer section={section} />);
    const trigger = screen.getByRole("button", { name: "Item 1" });
    const chevron = trigger.querySelector("[data-chevron]");
    expect(chevron).toBeTruthy();
  });

  it("toggles accordion rows with the same aria-expanded disclosure treatment", () => {
    const section = makeSection({
      __component: "sections.accordion",
      heading: "Accordion",
      items: [{ title: "Item 1", content: "<p>Content</p>" }],
    } as SectionDTO);

    render(<DefaultSectionRenderer section={section} />);

    const trigger = screen.getByRole("button", { name: "Item 1" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Content").closest(".prose-luxury")).toBeTruthy();
  });
});
