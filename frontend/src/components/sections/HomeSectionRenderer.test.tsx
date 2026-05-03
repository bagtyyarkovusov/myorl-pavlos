import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function makePromoSection(slideCount = 3): SectionDTO {
  const slides = [
    {
      title: "First topic",
      description: null,
      targetPageExcerpt: "<p>Target excerpt</p>",
      image: null,
      targetPage: { documentId: "page-1", slug: "first-topic", title: "First topic" },
      targetUrl: null,
    },
    {
      title: "Second topic",
      description: "<p>Slide description</p>",
      targetPageExcerpt: "<p>Ignored excerpt</p>",
      image: null,
      targetPage: { documentId: "page-2", slug: "second-topic", title: "Second topic" },
      targetUrl: null,
    },
    {
      title: "Third topic",
      description: "<p>Third description</p>",
      targetPageExcerpt: null,
      image: null,
      targetPage: { documentId: "page-3", slug: "third-topic", title: "Third topic" },
      targetUrl: null,
    },
  ].slice(0, slideCount);

  return makeSection({
    __component: "sections.promo-slider",
    heading: "Topics",
    intro: null,
    slides,
  } as SectionDTO);
}

function tileButtonLabels() {
  return screen
    .getAllByRole("button", { name: /^View slide/ })
    .map((button) => button.getAttribute("aria-label"));
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("HomeSectionRenderer", () => {
  it("renders a home social-links section", () => {
    const section = makeSection({
      __component: "sections.social-links",
      heading: "Follow Us",
      links: [{ name: "Facebook", url: "https://fb.com", icon: null }],
    } as SectionDTO);

    const { container } = render(<HomeSectionRenderer section={section} locale="el" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not render home advantages in the inline home flow", () => {
    const section = makeSection({
      __component: "sections.advantages",
      heading: "Stats",
      items: [{ title: "15+", description: "<p>Years</p>", icon: null }],
    } as SectionDTO);

    const { container } = render(<HomeSectionRenderer section={section} locale="el" />);
    expect(container).toBeEmptyDOMElement();
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
    expect(container.querySelectorAll("section")).toHaveLength(1);
  });

  it("renders linked resources once and renders HTML descriptions as content", () => {
    const section = makeSection({
      __component: "sections.linked-resources",
      heading: "Resources",
      items: [
        {
          title: "Resource 1",
          description: "<p>Text one</p>",
          image: null,
          targetPage: null,
          targetUrl: null,
        },
        {
          title: "Resource 2",
          description: "<p>Text two</p>",
          image: null,
          targetPage: null,
          targetUrl: null,
        },
      ],
    } as SectionDTO);

    render(<HomeSectionRenderer section={section} locale="el" />);

    expect(screen.getAllByText("Resource 1")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Resources" })).toBeNull();
    expect(screen.getByText("Text one")).toBeDefined();
    expect(screen.queryByText("<p>Text one</p>")).toBeNull();
    expect(screen.getByRole("link", { name: /01 Resource 1 Text one/ })).toHaveAttribute(
      "href",
      "/el/sitemap",
    );
    expect(screen.getByRole("link", { name: /02\s*Resource 2 Text two/ })).toHaveAttribute(
      "href",
      "/el/sitemap",
    );
  });

  it("renders promo slides with target excerpt fallback, CTA href, and active tab state", async () => {
    const section = makePromoSection();

    const { container } = render(<HomeSectionRenderer section={section} locale="el" />);

    expect(screen.queryByRole("heading", { name: "Topics" })).toBeNull();
    expect(screen.getByText("Target excerpt")).toBeDefined();
    expect(container.querySelector('a[href="/el/first-topic"]')).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "First topic" })).toHaveLength(2);
    expect(tileButtonLabels()).toEqual([
      "View slide 1: First topic",
      "View slide 2: Second topic",
      "View slide 3: Third topic",
    ]);

    const firstTab = screen.getByRole("tab", { name: "Slide 1: First topic" });
    const secondTab = screen.getByRole("tab", { name: "Slide 2: Second topic" });
    const firstTile = screen.getByRole("button", { name: "View slide 1: First topic" });
    const firstTopicLinks = screen.getAllByRole("link", { name: "First topic" });

    expect(firstTab).toHaveAttribute("aria-selected", "true");
    expect(firstTab.tagName).toBe("BUTTON");
    expect(firstTab.closest("article")).toBeTruthy();
    expect(secondTab).toHaveAttribute("aria-selected", "false");
    expect(firstTile).toHaveAttribute("aria-current", "true");
    expect(firstTopicLinks.every((link) => link.getAttribute("href") === "/el/first-topic")).toBe(
      true,
    );

    fireEvent.click(secondTab);

    expect(firstTab).toHaveAttribute("aria-selected", "false");
    expect(secondTab).toHaveAttribute("aria-selected", "true");
    await waitFor(() => {
      expect(screen.getByText("Slide description")).toBeDefined();
      expect(container.querySelector('a[href="/el/second-topic"]')).toBeTruthy();
    });
    expect(screen.getAllByRole("link", { name: "Second topic" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "View slide 2: Second topic" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(tileButtonLabels()).toEqual([
      "View slide 1: First topic",
      "View slide 2: Second topic",
      "View slide 3: Third topic",
    ]);
  });

  it("autoplays promo slides after hydration and pauses after manual navigation", () => {
    vi.useFakeTimers();
    const section = makePromoSection(2);

    render(<HomeSectionRenderer section={section} locale="el" />);

    const firstTab = screen.getByRole("tab", { name: "Slide 1: First topic" });
    const secondTab = screen.getByRole("tab", { name: "Slide 2: Second topic" });

    act(() => {
      vi.advanceTimersByTime(6500);
    });
    expect(firstTab).toHaveAttribute("aria-selected", "false");
    expect(secondTab).toHaveAttribute("aria-selected", "true");

    fireEvent.click(firstTab);
    expect(firstTab).toHaveAttribute("aria-selected", "true");

    act(() => {
      vi.advanceTimersByTime(6500);
    });
    expect(firstTab).toHaveAttribute("aria-selected", "true");

    act(() => {
      vi.advanceTimersByTime(6500);
    });
    expect(secondTab).toHaveAttribute("aria-selected", "true");
  });

  it("does not start promo autoplay for a single slide", () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const section = makePromoSection(1);

    render(<HomeSectionRenderer section={section} locale="el" />);

    expect(setIntervalSpy).not.toHaveBeenCalledWith(expect.any(Function), 6500);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText("Target excerpt")).toBeDefined();
  });

  it("supports promo previous and next buttons, keyboard arrows, and swipe gestures", () => {
    const section = makePromoSection();
    const { container } = render(<HomeSectionRenderer section={section} locale="el" />);

    const region = screen.getByRole("region", { name: "Topics" });
    const firstTab = screen.getByRole("tab", { name: "Slide 1: First topic" });
    const secondTab = screen.getByRole("tab", { name: "Slide 2: Second topic" });
    const thirdTab = screen.getByRole("tab", { name: "Slide 3: Third topic" });

    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(secondTab).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(firstTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(secondTab).toHaveAttribute("aria-selected", "true");

    const feature = container.querySelector('[class*="topic-feature"]') as HTMLElement;
    fireEvent.pointerDown(feature, { pointerType: "touch", clientX: 240, clientY: 20 });
    fireEvent.pointerUp(feature, { pointerType: "touch", clientX: 120, clientY: 24 });

    expect(thirdTab).toHaveAttribute("aria-selected", "true");
  });
});
