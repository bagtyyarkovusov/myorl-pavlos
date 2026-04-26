import { describe, expect, it } from "vitest";
import { toPageDTO } from "./dto";
import type { StrapiPagePayload } from "./types";

const basePage: StrapiPagePayload = {
  documentId: "doc-1",
  locale: "el",
  slug: "home",
  title: "Home",
  pageType: "home",
  layoutVariant: "home",
};

describe("toPageDTO sections", () => {
  it("narrows pageSections to typed SectionDTO entries", () => {
    const page: StrapiPagePayload = {
      ...basePage,
      pageSections: [
        {
          __component: "sections.faq",
          heading: "FAQ",
          items: [{ question: "Q1?", answer: "<p>A1</p>" }],
        },
        {
          __component: "sections.gallery",
          items: [{ caption: "Photo", image: { url: "/img/a.jpg" } }],
        },
      ],
    };

    const dto = toPageDTO(page);

    expect(dto.sections).toHaveLength(2);
    const faq = dto.sections[0];
    expect(faq?.__component).toBe("sections.faq");
    if (faq?.__component === "sections.faq") {
      expect(faq.items[0]?.question).toBe("Q1?");
      expect(faq.items[0]?.answer).toBe("<p>A1</p>");
    }

    const gallery = dto.sections[1];
    expect(gallery?.__component).toBe("sections.gallery");
    if (gallery?.__component === "sections.gallery") {
      expect(gallery.items[0]?.caption).toBe("Photo");
      expect(gallery.items[0]?.image?.url).toContain("/img/a.jpg");
    }
  });

  it("wraps a conditional faqSection into a typed sections.faq entry", () => {
    const page: StrapiPagePayload = {
      ...basePage,
      pageType: "faq",
      faqSection: {
        heading: "Frequently asked",
        items: [{ question: "Q?", answer: "A" }],
      },
    };

    const dto = toPageDTO(page);
    expect(dto.sections).toHaveLength(1);
    const section = dto.sections[0];
    expect(section?.__component).toBe("sections.faq");
  });

  it("drops sections with unknown __component", () => {
    const page: StrapiPagePayload = {
      ...basePage,
      pageSections: [{ __component: "sections.unknown" }],
    };

    expect(toPageDTO(page).sections).toEqual([]);
  });

  it("builds absolute alternate URLs from localizations", () => {
    const page: StrapiPagePayload = {
      ...basePage,
      locale: "el",
      slug: "index",
      localizations: [{ locale: "ru", slug: "glavnaia" }],
    };

    const dto = toPageDTO(page);

    expect(dto.alternateUrls.el).toBe("http://localhost:3000/el");
    expect(dto.alternateUrls.ru).toBe("http://localhost:3000/ru/glavnaia");
  });
});
