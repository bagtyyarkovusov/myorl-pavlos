import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionRenderer } from "./SectionRenderer";
import type { SectionDTO } from "@/lib/cms/types";

function makeSection(overrides: Partial<SectionDTO> = {}): SectionDTO {
  return {
    __component: "sections.faq",
    heading: null,
    intro: null,
    items: [],
    ...overrides,
  } as SectionDTO;
}

describe("SectionRenderer", () => {
  it("renders a section wrapper for an unknown __component", () => {
    const section = makeSection({ __component: "sections.unknown" as never });
    const { container } = render(<SectionRenderer section={section} />);

    const wrapper = container.querySelector("section");
    expect(wrapper).toBeTruthy();
  });

  it("dispatches an unknown __component to UnknownSection placeholder", () => {
    const section = makeSection({
      __component: "sections.brand-new" as never,
      heading: "Coming Soon",
    });
    const { container } = render(<SectionRenderer section={section} index={0} />);

    expect(container.querySelector('[data-section="unknown"]')).toBeTruthy();
    expect(screen.getByText("Coming Soon")).toBeTruthy();
    expect(screen.getByText("Content updating")).toBeTruthy();
  });

  it("preserves alternation cadence when an unknown section appears in a sequence", () => {
    const known = makeSection({
      __component: "sections.faq",
      heading: "Known",
      items: [],
    } as SectionDTO);
    const unknown = makeSection({
      __component: "sections.brand-new" as never,
      heading: "Unknown",
    });

    const { container: even } = render(<SectionRenderer section={unknown} index={0} />);
    const { container: odd } = render(<SectionRenderer section={unknown} index={1} />);
    const { container: knownOdd } = render(<SectionRenderer section={known} index={1} />);

    // Unknown sections share the same alternation contract as known ones —
    // index parity drives background, not the component type.
    expect(even.querySelector("section")?.getAttribute("data-background")).toBe(
      knownOdd.querySelector("section")?.getAttribute("data-background") === "white"
        ? "bone"
        : "white",
    );
    expect(odd.querySelector("section")?.getAttribute("data-background")).toBe(
      knownOdd.querySelector("section")?.getAttribute("data-background"),
    );
  });

  it("renders a promo-slider section", () => {
    const section = makeSection({
      __component: "sections.promo-slider",
      heading: "Featured",
      intro: "<p>Intro text</p>",
      slides: [
        {
          title: "Slide 1",
          description: "<p>Description</p>",
          image: null,
          targetPage: null,
          targetUrl: null,
        },
      ],
    } as SectionDTO);

    const { container } = render(<SectionRenderer section={section} />);
    expect(container.querySelector("h2")).toBeTruthy();
  });

  it("renders a linked-resources section", () => {
    const section = makeSection({
      __component: "sections.linked-resources",
      heading: "Resources",
      items: [
        { title: "Resource 1", description: "<p>Text</p>", targetPage: null, targetUrl: null },
      ],
    } as SectionDTO);

    const { container } = render(<SectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("renders a social-links section", () => {
    const section = makeSection({
      __component: "sections.social-links",
      heading: "Social",
      links: [{ name: "Facebook", url: "https://fb.com", icon: null }],
    } as SectionDTO);

    const { container } = render(<SectionRenderer section={section} />);
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

    const { container } = render(<SectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("renders an advantages section", () => {
    const section = makeSection({
      __component: "sections.advantages",
      heading: "Advantages",
      items: [{ title: "Adv 1", description: "<p>Text</p>", icon: null }],
    } as SectionDTO);

    const { container } = render(<SectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
    expect(container.querySelector("[data-card]")).toBeTruthy();
  });

  it("renders an accordion section", () => {
    const section = makeSection({
      __component: "sections.accordion",
      heading: "Accordion",
      items: [{ title: "Item 1", content: "<p>Content</p>" }],
    } as SectionDTO);

    render(<SectionRenderer section={section} />);
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

    render(<SectionRenderer section={section} />);
    expect(screen.getByRole("button", { name: "Q1" })).toHaveAttribute("aria-expanded", "false");
  });

  it("renders a tabs section", () => {
    const section = makeSection({
      __component: "sections.tabs",
      heading: "Tabs",
      items: [{ title: "Tab 1", content: "<p>Content</p>", link: null }],
    } as SectionDTO);

    const { container } = render(<SectionRenderer section={section} />);
    expect(container.querySelector("[role='tablist']")).toBeTruthy();
  });

  it("renders a gallery section", () => {
    const section = makeSection({
      __component: "sections.gallery",
      heading: "Gallery",
      items: [{ caption: "Image 1", image: { url: "/clinic.jpg", alternativeText: "Clinic" } }],
    } as SectionDTO);

    const { container } = render(<SectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
    expect(container.querySelector("[data-card]")).toBeTruthy();
  });

  it("renders a contact section", () => {
    const section = makeSection({
      __component: "sections.contact",
      heading: "Contact",
      details: [{ type: "Phone", valueHtml: "<p>123</p>" }],
      clinics: [],
    } as SectionDTO);

    const { container } = render(<SectionRenderer section={section} />);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("renders without img tag when media url is null", () => {
    const section = makeSection({
      __component: "sections.promo-slider",
      heading: "Featured",
      slides: [
        {
          title: "Slide",
          description: "<p>Desc</p>",
          image: { url: null },
          targetPage: null,
          targetUrl: null,
        },
      ],
    } as unknown as SectionDTO);

    const { container } = render(<SectionRenderer section={section} />);
    expect(container.querySelector("img")).toBeFalsy();
  });

  it("does not render heading when heading and intro are both null", () => {
    const section = makeSection({
      __component: "sections.faq",
      heading: null,
      intro: null,
      items: [],
    } as SectionDTO);

    const { container } = render(<SectionRenderer section={section} />);
    expect(container.querySelector("h2")).toBeFalsy();
  });

  it("renders heading when heading is present", () => {
    const section = makeSection({
      __component: "sections.faq",
      heading: "FAQ Section",
      intro: null,
      items: [],
    } as SectionDTO);

    const { container } = render(<SectionRenderer section={section} />);
    expect(container.querySelector("h2")).toBeTruthy();
  });

  it("passes section index into PageSection alternation", () => {
    const section = makeSection({
      __component: "sections.faq",
      heading: "FAQ Section",
      intro: null,
      items: [],
    } as SectionDTO);

    const { container } = render(<SectionRenderer section={section} index={1} />);
    expect(container.querySelector("section")?.getAttribute("data-background")).toBe("white");
  });

  it("suppresses contact sections with home context", () => {
    const section = makeSection({
      __component: "sections.contact",
      heading: "Home Contact",
      details: [{ type: "Phone", valueHtml: "<p>123</p>" }],
      clinics: [{ name: "Clinic A", addressHtml: "<p>Address</p>", phone: null, email: null }],
    } as SectionDTO);

    const { container } = render(<SectionRenderer section={section} context="home" />);
    expect(container.querySelectorAll("section")).toHaveLength(0);
  });

  it("delegates omitted home sections without adding an outer section wrapper", () => {
    const section = makeSection({
      __component: "sections.social-links",
      heading: "Follow Us",
      links: [{ name: "Facebook", url: "https://fb.com", icon: null }],
    } as SectionDTO);

    const { container } = render(<SectionRenderer section={section} context="home" />);

    expect(container.querySelectorAll("section")).toHaveLength(0);
  });
});
