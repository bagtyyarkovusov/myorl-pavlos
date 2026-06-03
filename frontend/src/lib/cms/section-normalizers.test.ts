import { describe, expect, it, beforeAll, vi } from "vitest";
import type { StrapiContactDetail, StrapiClinic, StrapiPagePayload } from "./types";
import type { StrapiSectionRaw } from "./types/sections";

let mod: typeof import("./section-normalizer");

beforeAll(async () => {
  vi.stubEnv("STRAPI_URL", "http://localhost:1337");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  mod = await import("./section-normalizer");
});

function makePage(overrides: Partial<StrapiPagePayload> = {}): StrapiPagePayload {
  return {
    documentId: "page-1",
    locale: "el",
    slug: "test",
    title: "Test",
    pageType: "content",
    layoutVariant: "standard",
    ...overrides,
  };
}

function makeSectionRaw(
  component: string,
  overrides: Partial<StrapiSectionRaw> = {},
): StrapiSectionRaw {
  return {
    __component: component,
    heading: "Section Heading",
    intro: "<p>Intro</p>",
    items: [],
    ...overrides,
  };
}

describe("toSemanticSections", () => {
  it("extracts pageSections for home pageType", () => {
    const section = makeSectionRaw("sections.faq", {
      items: [{ question: "Q1", answer: "<p>A1</p>" }],
    });
    const page = makePage({ pageType: "home", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    expect(result[0]!).toBeDefined();
  });

  it("extracts pageSections for non-home pageType (content)", () => {
    const section = makeSectionRaw("sections.faq", {
      items: [{ question: "Q1", answer: "<p>A1</p>" }],
    });
    const page = makePage({ pageType: "content", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    expect(result[0]!).toBeDefined();
  });

  it("extracts multiple pageSections from non-home pageType", () => {
    const faqSection = makeSectionRaw("sections.faq", {
      items: [{ question: "Q1", answer: "<p>A1</p>" }],
    });
    const gallerySection = makeSectionRaw("sections.gallery", {
      items: [{ caption: "Photo" }],
    });
    const page = makePage({ pageType: "content", pageSections: [faqSection, gallerySection] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(2);
  });

  it("ignores dedicated section fields (reads only pageSections)", () => {
    const page = makePage({ pageType: "faq", pageSections: [] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(0);
  });

  it("returns empty array when pageSections is null", () => {
    const page = makePage({ pageType: "content", pageSections: null });

    const result = mod.toSemanticSections(page);
    expect(result).toEqual([]);
  });

  it("extracts faqSection when pageType is faq", () => {
    const section = makeSectionRaw("sections.faq", {
      items: [{ question: "Q1", answer: "<p>A1</p>" }],
    });
    const page = makePage({ pageType: "faq", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    expect(result[0]!).toBeDefined();
  });

  it("extracts accordionSection when pageType is accordion", () => {
    const section = makeSectionRaw("sections.accordion", {
      items: [{ title: "Item 1", content: "<p>Content</p>" }],
    });
    const page = makePage({ pageType: "accordion", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    expect(result[0]!).toBeDefined();
  });

  it("extracts tabsSection when pageType is tabs", () => {
    const section = makeSectionRaw("sections.tabs", {
      items: [{ title: "Tab 1", content: "<p>Content</p>", link: "/page" }],
    });
    const page = makePage({ pageType: "tabs", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    expect(result[0]!).toBeDefined();
  });

  it("extracts gallerySection when pageType is gallery", () => {
    const section = makeSectionRaw("sections.gallery", {
      items: [{ caption: "Photo 1", image: { url: "/uploads/img.jpg" } }],
    });
    const page = makePage({ pageType: "gallery", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    expect(result[0]!).toBeDefined();
  });

  it("extracts contactSection when pageType is contact", () => {
    const section = {
      __component: "sections.contact",
      heading: "Contact Us",
      intro: null,
      details: [{ type: "Phone", value: "<p>123</p>" }],
      clinics: [{ name: "Clinic A", address: "<p>Address</p>", phone: "123", email: "a@b.com" }],
    };
    const page = makePage({ pageType: "contact", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    expect(sec.__component).toBe("sections.contact");
    if (sec.__component === "sections.contact") {
      expect(sec.details).toHaveLength(1);
      expect(sec.clinics).toHaveLength(1);
    }
  });

  it("ignores null sections", () => {
    const page = makePage({ pageType: "faq", pageSections: null });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(0);
  });

  it("returns empty array for content pageType with no sections", () => {
    const page = makePage({ pageType: "content" });

    const result = mod.toSemanticSections(page);
    expect(result).toEqual([]);
  });

  it("normalises unknown __component into sections.unknown", () => {
    const section = makeSectionRaw("blocks.unknown");
    const page = makePage({ pageType: "home", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      __component: "sections.unknown",
      originalComponent: "blocks.unknown",
    });
  });

  it("rejects null __component", () => {
    const section = makeSectionRaw("" as never, { __component: null });
    const page = makePage({ pageType: "home", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(0);
  });

  it("handles items: null gracefully (Strapi empty repeatable)", () => {
    const section = makeSectionRaw("sections.faq", { items: null });
    const page = makePage({ pageType: "faq", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
  });

  it("normalizes promo-slider section fully", () => {
    const section = makeSectionRaw("sections.promo-slider", {
      slides: [
        {
          title: "Slide 1",
          description: "<p>Desc</p>",
          image: { url: "/uploads/slide.jpg", width: 800, height: 600 },
          targetPage: {
            documentId: "page-2",
            slug: "target",
            title: "Target",
            excerpt: "<p>Target excerpt</p>",
          },
          targetUrl: "https://external.com",
        },
      ],
    });
    const page = makePage({ pageType: "home", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    if (sec.__component === "sections.promo-slider") {
      expect(sec.slides).toHaveLength(1);
      expect(sec.slides[0]!.title).toBe("Slide 1");
      expect(sec.slides[0]!.image?.url).toContain("/uploads/slide.jpg");
      expect(sec.slides[0]!.targetPage?.documentId).toBe("page-2");
      expect(sec.slides[0]!.targetPageExcerpt).toBe("<p>Target excerpt</p>");
      expect(sec.slides[0]!.targetUrl).toBe("https://external.com");
    }
  });

  it("normalizes home hero section", () => {
    const section = makeSectionRaw("sections.home-hero", {
      kicker: "Clinic",
      heading: "CMS Hero",
      intro: "CMS intro",
      media: { url: "/uploads/home.jpg", width: 1200, height: 800 },
      ctaLabel: "Book",
      ctaUrl: "/el/rantevou",
      ctaTargetPage: {
        documentId: "appointment",
        slug: "rantevou",
        title: "Appointment",
      },
    } as never);
    const page = makePage({ pageType: "home", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    const sec = result[0]!;
    expect(sec.__component).toBe("sections.home-hero");
    if (sec.__component === "sections.home-hero") {
      expect(sec.heading).toBe("CMS Hero");
      expect(sec.media?.url).toContain("/uploads/home.jpg");
      expect(sec.ctaTargetPage?.slug).toBe("rantevou");
    }
  });

  it("normalizes home testimonials teaser and notice sections", () => {
    const page = makePage({
      pageType: "home",
      pageSections: [
        makeSectionRaw("sections.home-testimonials-teaser", {
          heading: "CMS testimonials",
          intro: "CMS testimonials intro",
        }),
        makeSectionRaw("sections.home-notice", {
          heading: "CMS notice",
          intro: "<p>Legacy notice</p>",
        }),
      ],
    });

    const result = mod.toSemanticSections(page);
    expect(result.map((section) => section.__component)).toEqual([
      "sections.home-testimonials-teaser",
      "sections.home-notice",
    ]);
  });

  it("normalizes linked-resources section", () => {
    const section = makeSectionRaw("sections.linked-resources", {
      items: [
        {
          title: "Resource 1",
          description: "<p>Text</p>",
          targetUrl: "/page",
          targetPage: {
            documentId: "page-2",
            slug: "target",
            title: "Target",
            imageCenter: { url: "/uploads/center.jpg", width: 900, height: 600 },
            featuredImage: { url: "/uploads/featured.jpg", width: 900, height: 600 },
          },
        },
      ],
    });
    const page = makePage({ pageType: "home", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    if (sec.__component === "sections.linked-resources") {
      expect(sec.items).toHaveLength(1);
      expect(sec.items[0]!.title).toBe("Resource 1");
      expect(sec.items[0]!.image?.url).toContain("/uploads/center.jpg");
    }
  });

  it("normalizes social-links section — empty name defaults to empty string", () => {
    const section = makeSectionRaw("sections.social-links", {
      links: [{ name: null, url: "https://fb.com" }],
    });
    const page = makePage({ pageType: "home", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    if (sec.__component === "sections.social-links") {
      expect(sec.links[0]!.name).toBe("");
      expect(sec.links[0]!.url).toBe("https://fb.com");
    }
  });

  it("normalizes video section with media", () => {
    const section = makeSectionRaw("sections.video", {
      videos: [
        {
          title: "Video 1",
          videoMp4: { url: "/uploads/video.mp4" },
          videoWebm: null,
          thumbnail: { url: "/uploads/thumb.jpg" },
          videoTags: "surgery",
        },
      ],
    });
    const page = makePage({ pageType: "home", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    if (sec.__component === "sections.video") {
      expect(sec.videos[0]!.title).toBe("Video 1");
      expect(sec.videos[0]!.videoMp4?.url).toContain("/uploads/video.mp4");
      expect(sec.videos[0]!.thumbnail?.url).toContain("/uploads/thumb.jpg");
    }
  });

  it("normalizes advantages section", () => {
    const section = makeSectionRaw("sections.advantages", {
      items: [{ title: "Advantage 1", description: "<p>Text</p>", icon: "star" }],
    });
    const page = makePage({ pageType: "home", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    if (sec.__component === "sections.advantages") {
      expect(sec.items[0]!.title).toBe("Advantage 1");
      expect(sec.items[0]!.icon).toBe("star");
    }
  });

  it("normalizes accordion section", () => {
    const section = makeSectionRaw("sections.accordion", {
      items: [{ title: "Item 1", content: "<p>Body</p>" }],
    });
    const page = makePage({ pageType: "accordion", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    if (sec.__component === "sections.accordion") {
      expect(sec.items[0]!.title).toBe("Item 1");
      expect(sec.items[0]!.content).toBe("<p>Body</p>");
    }
  });

  it("normalizes faq section", () => {
    const section = makeSectionRaw("sections.faq", {
      items: [{ question: "Q1", answer: "<p>A1</p>" }],
    });
    const page = makePage({ pageType: "faq", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    if (sec.__component === "sections.faq") {
      expect(sec.items[0]!.question).toBe("Q1");
      expect(sec.items[0]!.answer).toBe("<p>A1</p>");
    }
  });

  it("normalizes tabs section", () => {
    const section = makeSectionRaw("sections.tabs", {
      items: [{ title: "Tab 1", content: "<p>Body</p>", link: "/page" }],
    });
    const page = makePage({ pageType: "tabs", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    if (sec.__component === "sections.tabs") {
      expect(sec.items[0]!.title).toBe("Tab 1");
      expect(sec.items[0]!.link).toBe("/page");
    }
  });

  it("normalizes gallery section with media", () => {
    const section = makeSectionRaw("sections.gallery", {
      items: [{ caption: "Photo", image: { url: "/uploads/photo.jpg" } }],
    });
    const page = makePage({ pageType: "gallery", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    if (sec.__component === "sections.gallery") {
      expect(sec.items[0]!.caption).toBe("Photo");
      expect(sec.items[0]!.image?.url).toContain("/uploads/photo.jpg");
    }
  });

  it("handles gallery item with entirely missing image field", () => {
    const section = makeSectionRaw("sections.gallery", {
      items: [{ caption: "No Image" }],
    });
    const page = makePage({ pageType: "gallery", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    if (sec.__component === "sections.gallery") {
      expect(sec.items[0]!.caption).toBe("No Image");
      expect(sec.items[0]!.image).toBeNull();
    }
  });

  it("handles slides fallback to items for promo-slider", () => {
    const section = makeSectionRaw("sections.promo-slider", {
      slides: undefined,
      items: [{ title: "From items", description: "<p>Desc</p>" }],
    });
    const page = makePage({ pageType: "home", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    if (sec.__component === "sections.promo-slider") {
      expect(sec.slides).toHaveLength(1);
      expect(sec.slides[0]!.title).toBe("From items");
    }
  });

  it("handles links fallback to items for social-links", () => {
    const section = makeSectionRaw("sections.social-links", {
      links: undefined,
      items: [{ name: "Twitter", url: "https://twitter.com" }],
    });
    const page = makePage({ pageType: "home", pageSections: [section] });

    const result = mod.toSemanticSections(page);
    expect(result).toHaveLength(1);
    const sec = result[0]!;
    if (sec.__component === "sections.social-links") {
      expect(sec.links).toHaveLength(1);
    }
  });
});

describe("toContactDetailDTO", () => {
  it("normalizes contact detail with type and value", () => {
    const detail: StrapiContactDetail = { type: "Phone", value: "<p>+302101234567</p>" };
    const result = mod.toContactDetailDTO(detail);
    expect(result.type).toBe("Phone");
    expect(result.valueHtml).toBe("<p>+302101234567</p>");
  });

  it("handles null type gracefully", () => {
    const detail: StrapiContactDetail = { type: null, value: "<p>Text</p>" };
    const result = mod.toContactDetailDTO(detail);
    expect(result.type).toBe("");
    expect(result.valueHtml).toBe("<p>Text</p>");
  });

  it("handles null value gracefully", () => {
    const detail: StrapiContactDetail = { type: "Email", value: null };
    const result = mod.toContactDetailDTO(detail);
    expect(result.type).toBe("Email");
    expect(result.valueHtml).toBe("");
  });
});

describe("toContactClinicDTO", () => {
  it("normalizes a valid clinic", () => {
    const clinic: StrapiClinic = {
      name: "Main Clinic",
      address: "<p>123 Main St, Athens</p>",
      phone: "+302101234567",
      email: "clinic@example.com",
      latitude: 37.9838,
      longitude: 23.7275,
    };
    const result = mod.toContactClinicDTO(clinic);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Main Clinic");
    expect(result?.addressHtml).toBe("<p>123 Main St, Athens</p>");
    expect(result?.phone).toBe("+302101234567");
    expect(result?.email).toBe("clinic@example.com");
    expect(result?.latitude).toBe(37.9838);
    expect(result?.longitude).toBe(23.7275);
  });

  it("returns null for empty name", () => {
    const clinic: StrapiClinic = { name: "", address: "<p>Address</p>" };
    const result = mod.toContactClinicDTO(clinic);
    expect(result).toBeNull();
  });

  it("returns null for empty address", () => {
    const clinic: StrapiClinic = { name: "Clinic", address: "" };
    const result = mod.toContactClinicDTO(clinic);
    expect(result).toBeNull();
  });

  it("returns null for null name", () => {
    const clinic: StrapiClinic = { name: null, address: "<p>Address</p>" };
    const result = mod.toContactClinicDTO(clinic);
    expect(result).toBeNull();
  });
});
