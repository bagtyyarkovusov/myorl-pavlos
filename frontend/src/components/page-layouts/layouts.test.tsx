import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@/lib/cms/video-entries", () => ({
  fetchVideoEntries: vi.fn(async () => []),
}));

vi.mock("@/lib/cms/cms-api", () => ({
  getPage: vi.fn(),
}));

import { HomePage } from "./HomePage";
import { StandardPage } from "./StandardPage";
import { SystemPage } from "./SystemPage";
import { SectionIndexPage } from "./SectionIndexPage";
import { SectionHubPage } from "./SectionHubPage";
import { PageBody, extractHeadings, addHeadingIds, relatedTopicHref } from "./PageBody";
import { AppointmentPage } from "./AppointmentPage";
import { ContactPage } from "./ContactPage";
import { GalleryPage } from "./GalleryPage";
import { ClinicHubPage } from "./ClinicHubPage";
import { ClinicLocationBlock } from "@/components/clinic/ClinicLocationBlock";
import { getPage } from "@/lib/cms/cms-api";
import { QuestionListPage } from "./QuestionListPage";
import { FrontendNativePage } from "./FrontendNativePage";
import type {
  HomeResourceGroupSectionDTO,
  NavigationNodeDTO,
  PageDTO,
  GlobalSettingsDTO,
} from "@/lib/cms/types";

beforeEach(() => {
  vi.stubEnv("STRAPI_URL", "http://localhost:1337");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://myorl.example.com");
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const MOCK_GLOBAL_SETTINGS: GlobalSettingsDTO = {
  locale: "el",
  address: "Λεωφόρος Αλεξάνδρας 201 & Πανόρμου, Αμπελόκηποι, Αθήνα",
  phoneTel: "+302110194618",
  phoneDisplay: "211-01 94 618",
  secondaryPhoneTel: "+306945773077",
  secondaryPhoneDisplay: "6945 77 30 77",
  email: "pavlos.tsolaridis@gmail.com",
  hours: "Δευ–Παρ · 09:00 – 21:00\nΣάβ · 10:00 – 14:00",
  footerTagline: null,
  disclaimerText: null,
  socialLinks: [],
};

const BASE_PAGE: PageDTO = {
  documentId: "test-1",
  locale: "el",
  slug: "test",
  title: "Test Page",
  menuTitle: null,
  navLabel: "Test",
  pageType: "content",
  layoutVariant: "standard",
  renderMode: "cms",
  seo: {
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    ogImage: null,
    robotsNoindex: false,
    robotsNofollow: false,
    sitemapExclude: false,
    sitemapPriority: null,
    sitemapChangeFrequency: null,
  },
  seoTitle: "Test Page",
  content: "<p>Hello world</p>",
  excerpt: null,
  featuredImage: null,
  imageCenter: null,
  externalUrl: null,
  isFolder: false,
  hideFromMenu: false,
  menuIndex: 0,
  parentPage: null,
  relatedPages: [],
  relatedTopics: [],
  tags: [],
  infoBlockBottom: null,
  articleAuthor: null,
  sources: null,
  popUpClose: null,
  disclaimerOverride: "default",
  alternateUrls: {},
  sections: [],
};

function makeNav(slug: string, label: string, index = 0): NavigationNodeDTO {
  return {
    documentId: `nav-${slug}`,
    locale: "el",
    slug,
    title: label,
    menuTitle: null,
    navLabel: label,
    menuIndex: index,
    hideFromMenu: false,
    parentPage: null,
    externalUrl: null,
    isFolder: false,
    layoutVariant: "standard",
    excerpt: null,
    featuredImage: null,
    imageCenter: null,
    href: `/el/${slug}`,
    tags: [],
    children: [],
  };
}

describe("PageHeader", () => {
  it("renders title in the page hero header", () => {
    render(<StandardPage page={{ ...BASE_PAGE, title: "Accent Test" }} />);
    const header = screen.getByRole("banner");
    expect(header.querySelector("h1")).toBeTruthy();
    expect(header.querySelector("h1")?.textContent).toBe("Accent Test");
  });

  it("renders kicker text from layout variant", () => {
    render(
      <StandardPage page={{ ...BASE_PAGE, title: "Reference", layoutVariant: "service-faq" }} />,
    );
    expect(screen.getByText("service faq")).toBeDefined();
  });
});

describe("StandardPage", () => {
  it("renders title and excerpt", () => {
    render(
      <StandardPage page={{ ...BASE_PAGE, title: "My Article", excerpt: "A short excerpt" }} />,
    );

    expect(screen.getByRole("heading", { name: "My Article" })).toBeDefined();
    expect(screen.getByText("A short excerpt")).toBeDefined();
  });

  it("renders without navigation prop", () => {
    render(<StandardPage page={{ ...BASE_PAGE, title: "Parent", isFolder: true }} />);
    expect(screen.getByRole("heading", { name: "Parent" })).toBeDefined();
  });

  it("renders content via CmsHtml", () => {
    render(<StandardPage page={{ ...BASE_PAGE, content: "<p>Body text</p>" }} />);

    expect(screen.getByText("Body text")).toBeDefined();
  });

  it("uses a two-column aside layout for standard pages with headings", () => {
    render(
      <StandardPage
        page={{
          ...BASE_PAGE,
          layoutVariant: "standard",
          content: "<h2>Symptoms</h2><p>Body text</p>",
        }}
      />,
    );

    const main = document.querySelector("main[data-prose-layout='standard']");
    expect(main).toBeTruthy();
    expect(within(main as HTMLElement).getByRole("link", { name: "Symptoms" })).toHaveAttribute(
      "href",
      "#symptoms",
    );
  });

  it("uses a two-column aside layout for standard pages with related topics only", () => {
    render(
      <StandardPage
        page={{
          ...BASE_PAGE,
          layoutVariant: "standard",
          content: "<p>Flat body</p>",
          relatedTopics: [{ documentId: "r1", slug: "peer", title: "Peer article" }],
        }}
      />,
    );

    expect(document.querySelector("main[data-prose-layout='standard']")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Σχετικά θέματα" })).toBeTruthy();
  });

  it("wraps header and body in a page shell div with container", () => {
    const { container } = render(<StandardPage page={BASE_PAGE} />);
    const shell = container.firstElementChild;
    expect(shell?.tagName.toLowerCase()).toBe("div");
    expect(shell?.querySelector(".container")).toBeTruthy();
  });

  it("renders page sections through SectionRenderer", () => {
    const sectionPage: PageDTO = {
      ...BASE_PAGE,
      title: "Standard with Sections",
      sections: [
        {
          __component: "sections.faq",
          heading: "FAQ",
          items: [{ question: "Common Q", answer: "Common A" }],
        },
      ],
    };

    render(<StandardPage page={sectionPage} />);
    expect(screen.getByText("Common Q")).toBeDefined();
  });

  it("routes service articles through the cinematic hero and service prose layout", () => {
    render(
      <StandardPage
        page={{
          ...BASE_PAGE,
          title: "Implant Therapy",
          excerpt: "A treatment overview",
          layoutVariant: "service-article",
          content: "<p>Service body</p>",
          featuredImage: {
            url: "/implant.jpg",
            alternativeText: "Implant theatre",
            width: 1200,
            height: 800,
          },
          sections: [
            {
              __component: "sections.faq",
              heading: "What to expect",
              items: [{ question: "How long?", answer: "<p>One visit</p>" }],
            },
          ],
        }}
      />,
    );

    expect(document.querySelector("[data-hero-variant='cinematic']")).toBeTruthy();
    expect(document.querySelector("[data-service-layout='true']")).toBeTruthy();
    const serviceAside = document.querySelector("[data-service-layout='true'] aside");
    expect(serviceAside).toBeTruthy();
    expect(
      within(serviceAside as HTMLElement).getByRole("link", { name: "What to expect" }),
    ).toHaveAttribute("href", "#section-1");
    expect(screen.getByText("Service body").closest("div")?.getAttribute("data-variant")).toBe(
      "service",
    );
  });

  it("routes encyclopedia articles through compact hero, generated TOC, and dense prose", () => {
    render(
      <StandardPage
        page={{
          ...BASE_PAGE,
          title: "Sinus Encyclopedia",
          layoutVariant: "encyclopedia-article",
          content: "<h2>Diagnosis</h2><p>Reference body</p><h3>Imaging</h3>",
          relatedTopics: [
            {
              documentId: "related-nasal-guide",
              slug: "nasal-guide",
              title: "Nasal guide",
            },
          ],
        }}
      />,
    );

    expect(document.querySelector("[data-hero-variant='compact']")).toBeTruthy();
    expect(document.querySelector("[data-article-layout='encyclopedia']")).toBeTruthy();
    const contentsNavs = screen.getAllByRole("navigation", { name: "Περιεχόμενα" });
    expect(contentsNavs.length).toBeGreaterThanOrEqual(1);
    const contentsNavPrimary = contentsNavs[0];
    expect(contentsNavPrimary).toBeDefined();
    expect(
      within(contentsNavPrimary as HTMLElement)
        .getByRole("link", { name: "Diagnosis" })
        .getAttribute("href"),
    ).toBe("#diagnosis");
    expect(screen.getByText("Reference body").closest("div")?.getAttribute("data-variant")).toBe(
      "encyclopedia",
    );
    expect(screen.getAllByRole("link", { name: "Nasal guide" }).length).toBeGreaterThanOrEqual(1);
  });

  it("routes specialized articles through journal hero, author sidebar, sources, and callouts", () => {
    render(
      <StandardPage
        page={{
          ...BASE_PAGE,
          title: "Specialized Rhinology",
          layoutVariant: "specialized-article",
          content:
            '<h2>Evidence</h2><p>Research body</p><div class="callout-teal">Clinical note</div>',
          articleAuthor: "Dr Expert, MD",
          sources: "<ol><li>Journal source</li></ol>",
        }}
      />,
    );

    expect(document.querySelector("[data-hero-variant='journal']")).toBeTruthy();
    expect(document.querySelector("[data-article-layout='specialized']")).toBeTruthy();
    expect(screen.getAllByText("Dr Expert, MD")).toHaveLength(2);
    expect(screen.getByText("Journal source")).toBeDefined();
    expect(screen.getByText("Research body").closest("div")?.getAttribute("data-variant")).toBe(
      "specialized",
    );
    expect(screen.getByText("Clinical note").closest("div")?.className).toContain("callout-teal");
  });
});

describe("Biography page", () => {
  it("renders biography page with data-variant='dense'", () => {
    render(
      <StandardPage
        page={{
          ...BASE_PAGE,
          slug: "viografiko",
          title: "Βιογραφικό",
          content: "<p>Curriculum vitae text</p>",
        }}
      />,
    );

    expect(
      screen.getByText("Curriculum vitae text").closest("div")?.getAttribute("data-variant"),
    ).toBe("dense");
  });

  it("renders biography page tables with compact prose-dense styling", () => {
    render(
      <StandardPage
        page={{
          ...BASE_PAGE,
          slug: "viografiko",
          title: "Βιογραφικό",
          content:
            "<table><thead><tr><th>Year</th><th>Position</th></tr></thead><tbody><tr><td>2020</td><td>Chief</td></tr></tbody></table>",
        }}
      />,
    );

    const prose = screen.getByText("Chief").closest("div");
    expect(prose?.className).toContain("prose-dense");
    expect(prose?.getAttribute("data-variant")).toBe("dense");
  });

  it("renders Russian biography page (/ru/viografiko) with dense prose", () => {
    render(
      <StandardPage
        page={{
          ...BASE_PAGE,
          locale: "ru",
          slug: "viografiko",
          title: "Биография",
          content: "<p>Текст биографии</p>",
        }}
      />,
    );

    expect(screen.getByText("Текст биографии").closest("div")?.getAttribute("data-variant")).toBe(
      "dense",
    );
  });

  it("renders biography page with headings in two-column aside with data-prose-layout='dense'", () => {
    render(
      <StandardPage
        page={{
          ...BASE_PAGE,
          slug: "viografiko",
          title: "Βιογραφικό",
          content: "<h2>Εκπαίδευση</h2><p>Πανεπιστήμιο Αθηνών</p><h3>Ειδικότητα</h3><p>ΩΡΛ</p>",
        }}
      />,
    );

    const main = document.querySelector("main[data-prose-layout='dense']");
    expect(main).toBeTruthy();
    const contentsNavs = screen.getAllByRole("navigation", { name: "Περιεχόμενα" });
    expect(contentsNavs.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("Πανεπιστήμιο Αθηνών").closest("div")?.getAttribute("data-variant"),
    ).toBe("dense");
  });

  it("does not apply dense variant to non-biography pages", () => {
    render(
      <StandardPage
        page={{
          ...BASE_PAGE,
          slug: "ypiresies",
          title: "Υπηρεσίες",
          content: "<p>Regular page text</p>",
        }}
      />,
    );

    const prose = screen.getByText("Regular page text").closest("div");
    expect(prose?.getAttribute("data-variant")).toBeNull();
  });
});

describe("SystemPage", () => {
  const systemPage: PageDTO = {
    ...BASE_PAGE,
    pageType: "system",
    layoutVariant: "standard",
    title: "Privacy Policy",
    content: "<p>Privacy policy text</p>",
  };

  it("renders title and content without kicker text", () => {
    render(<SystemPage page={systemPage} />);

    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeDefined();
    expect(screen.getByText("Privacy policy text")).toBeDefined();
    expect(screen.queryByText("standard")).toBeNull();
  });

  it("does not render hero image when page has no featuredImage or imageCenter", () => {
    const { container } = render(<SystemPage page={systemPage} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders hero image when editor explicitly attached page-specific imagery", () => {
    const pageWithImage: PageDTO = {
      ...systemPage,
      featuredImage: {
        url: "/legal-icon.jpg",
        alternativeText: "Legal icon",
        width: 200,
        height: 200,
      },
    };

    render(<SystemPage page={pageWithImage} />);
    expect(screen.getByRole("img", { name: "Legal icon" })).toBeDefined();
  });

  it("uses compact prose shell without two-column aside layout", () => {
    const pageWithHeadings: PageDTO = {
      ...systemPage,
      content: "<h2>Our Policy</h2><p>Details</p>",
    };

    render(<SystemPage page={pageWithHeadings} />);

    expect(document.querySelector("[data-prose-layout='standard']")).toBeNull();
    expect(document.querySelector("[data-article-layout]")).toBeNull();
    expect(document.querySelector("h2")).toBeDefined();
  });

  it("does not render related topics", () => {
    const pageWithTopics: PageDTO = {
      ...systemPage,
      relatedTopics: [{ documentId: "r1", slug: "peer", title: "Peer article" }],
    };

    render(<SystemPage page={pageWithTopics} />);
    expect(screen.queryByRole("region", { name: "Σχετικά θέματα" })).toBeNull();
  });

  it("does not render medical disclaimer", () => {
    render(<SystemPage page={systemPage} />);
    expect(screen.queryByRole("note")).toBeNull();
  });
});

describe("HomePage", () => {
  it("renders hero title", () => {
    const homePage: PageDTO = {
      ...BASE_PAGE,
      pageType: "home",
      layoutVariant: "home",
      title: "Home",
    };

    render(
      <HomePage
        page={homePage}
        appointmentHref="/el/rantevou"
        navigation={[]}
        settings={MOCK_GLOBAL_SETTINGS}
      />,
    );

    expect(document.querySelector("[data-locale='el']")).toBeDefined();
  });

  it("renders data-locale attribute", () => {
    const homePage: PageDTO = {
      ...BASE_PAGE,
      pageType: "home",
      layoutVariant: "home",
      title: "Home",
    };

    render(
      <HomePage
        page={homePage}
        appointmentHref="/el/rantevou"
        navigation={[]}
        settings={MOCK_GLOBAL_SETTINGS}
      />,
    );

    expect(document.querySelector("[data-locale='el']")?.getAttribute("data-locale")).toBe("el");
  });

  it("suppresses social sections in the home flow", () => {
    const homePage: PageDTO = {
      ...BASE_PAGE,
      pageType: "home",
      layoutVariant: "home",
      title: "Home",
      sections: [
        {
          __component: "sections.social-links",
          heading: "Follow Us",
          links: [{ name: "Facebook", url: "https://fb.com", icon: null }],
        },
      ],
    };

    render(
      <HomePage
        page={homePage}
        appointmentHref="/el/rantevou"
        navigation={[]}
        settings={MOCK_GLOBAL_SETTINGS}
      />,
    );
    expect(screen.queryByText("Follow Us")).toBeNull();
  });

  it("dispatches an unknown section type through UnknownSection placeholder on home", () => {
    const homePage: PageDTO = {
      ...BASE_PAGE,
      pageType: "home",
      layoutVariant: "home",
      title: "Home",
      sections: [
        {
          __component: "sections.brand-new" as never,
          heading: "MARK_UNKNOWN",
          intro: null,
        } as unknown as PageDTO["sections"][number],
      ],
    };

    const { container } = render(
      <HomePage
        page={homePage}
        appointmentHref="/el/rantevou"
        navigation={[]}
        settings={MOCK_GLOBAL_SETTINGS}
      />,
    );

    expect(container.querySelector('[data-section="unknown"]')).toBeTruthy();
    expect(screen.getByText("MARK_UNKNOWN")).toBeTruthy();
  });

  it("renders without injected MenuAccessGrid when no promo-slider section is present", () => {
    const homePage: PageDTO = {
      ...BASE_PAGE,
      pageType: "home",
      layoutVariant: "home",
      title: "Home",
      sections: [
        {
          __component: "sections.advantages",
          heading: "MARK_ADVANTAGES",
          intro: null,
          items: [],
        },
      ],
    };
    const navigation = [makeNav("yperesies", "Services", 1)];

    render(
      <HomePage
        page={homePage}
        appointmentHref="/el/rantevou"
        navigation={navigation}
        settings={MOCK_GLOBAL_SETTINGS}
      />,
    );

    // MenuAccessGrid renders the navigation entries; without promo-slider the
    // injection contract says the grid is suppressed.
    expect(screen.queryByRole("link", { name: /Services/ })).toBeNull();
  });

  it("renders six primary menu links after the first promo slider", () => {
    const homePage: PageDTO = {
      ...BASE_PAGE,
      pageType: "home",
      layoutVariant: "home",
      title: "Home",
      sections: [
        {
          __component: "sections.promo-slider",
          heading: "Topics",
          slides: [
            {
              title: "Slide",
              description: null,
              targetPageExcerpt: null,
              image: null,
              targetPage: null,
              targetUrl: null,
            },
          ],
        },
      ],
    };
    const navigation = [
      makeNav("yperesies", "Services", 1),
      makeNav("epemvaseis", "Operations", 2),
      makeNav("diagnosi", "Diagnostics", 3),
      makeNav("klinikes", "Hospitals", 4),
      makeNav("timokatalogos", "Prices", 5),
      makeNav("video", "Video", 6),
    ];

    render(
      <HomePage
        page={homePage}
        appointmentHref="/el/rantevou"
        navigation={navigation}
        settings={MOCK_GLOBAL_SETTINGS}
      />,
    );

    expect(screen.getByRole("link", { name: /Services/ })).toHaveAttribute("href", "/el/yperesies");
    expect(screen.getByRole("link", { name: /Video/ })).toHaveAttribute("href", "/el/video");
  });

  it("renders home hero, testimonials heading, and notice from Strapi sections", () => {
    const homePage: PageDTO = {
      ...BASE_PAGE,
      pageType: "home",
      layoutVariant: "home",
      title: "Home",
      sections: [
        {
          __component: "sections.home-hero",
          kicker: "CMS kicker",
          heading: "CMS hero heading",
          intro: "CMS hero intro",
          media: null,
          ctaLabel: "CMS CTA",
          ctaUrl: "/el/rantevou",
          ctaTargetPage: null,
        },
        {
          __component: "sections.home-testimonials-teaser",
          heading: "CMS testimonials heading",
          intro: "CMS testimonials intro",
        },
        {
          __component: "sections.home-notice",
          heading: "CMS notice heading",
          intro: "<p>CMS notice body</p>",
        },
      ],
    };

    render(
      <HomePage
        page={homePage}
        appointmentHref="/el/fallback"
        navigation={[]}
        settings={MOCK_GLOBAL_SETTINGS}
        homeTestimonials={{
          aggregateRating: 5,
          userRatingCount: 12,
          googleMapsUrl: "https://example.com/maps",
          googleMapsReviewsUrl: "https://example.com/reviews",
          source: "curated",
          quotes: [],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "CMS hero heading" })).toBeDefined();
    expect(screen.getByText("CMS testimonials heading")).toBeDefined();
    expect(screen.getByText("CMS notice body")).toBeDefined();
    expect(screen.queryByText("Τι γράφουν στο Google Maps")).toBeNull();
  });

  it("does not use hard-coded quick access descriptions when excerpts are missing", () => {
    const homePage: PageDTO = {
      ...BASE_PAGE,
      pageType: "home",
      layoutVariant: "home",
      title: "Home",
      sections: [
        {
          __component: "sections.promo-slider",
          heading: "Topics",
          slides: [
            {
              title: "Slide",
              description: null,
              targetPageExcerpt: null,
              image: null,
              targetPage: null,
              targetUrl: null,
            },
          ],
        },
      ],
    };

    render(
      <HomePage
        page={homePage}
        appointmentHref="/el/rantevou"
        navigation={[makeNav("yperesies", "Services", 1)]}
        settings={MOCK_GLOBAL_SETTINGS}
      />,
    );

    expect(screen.getByRole("link", { name: "Services" })).toBeDefined();
    expect(screen.queryByText("Βρείτε γρήγορα τις βασικές υπηρεσίες του ιατρείου.")).toBeNull();
  });

  it("renders home resource groups from CMS sections", async () => {
    const homePage: PageDTO = {
      ...BASE_PAGE,
      pageType: "home",
      layoutVariant: "home",
      title: "Home",
      sections: [
        {
          __component: "sections.promo-slider",
          heading: "Topics",
          slides: [
            {
              title: "Slide",
              description: null,
              targetPageExcerpt: null,
              image: null,
              targetPage: null,
              targetUrl: null,
            },
          ],
        },
        {
          __component: "sections.home-resource-group",
          group: "operations",
          heading: "Επεμβάσεις",
          intro: null,
          items: [
            {
              title: "Operation A",
              description: "<p>Op desc</p>",
              image: null,
              targetPage: { documentId: "1", slug: "op-a", title: "Op A" },
              targetUrl: null,
            },
          ],
          viewAllTarget: { documentId: "3", slug: "epemvaseis", title: "Operations" },
          viewAllLabel: "Όλες οι επεμβάσεις",
        } as HomeResourceGroupSectionDTO,
        {
          __component: "sections.home-resource-group",
          group: "services",
          heading: "Υπηρεσίες",
          intro: null,
          items: [
            {
              title: "Service A",
              description: "<p>Svc desc</p>",
              image: null,
              targetPage: { documentId: "2", slug: "svc-a", title: "Svc A" },
              targetUrl: null,
            },
          ],
          viewAllTarget: null,
          viewAllLabel: null,
        } as HomeResourceGroupSectionDTO,
      ],
    };

    render(
      <HomePage
        page={homePage}
        appointmentHref="/el/rantevou"
        navigation={[]}
        settings={MOCK_GLOBAL_SETTINGS}
      />,
    );

    // Wait for dynamic imports to resolve
    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { name: "Επεμβάσεις" })).toBeDefined();
    });

    expect(screen.getByRole("heading", { name: "Υπηρεσίες" })).toBeDefined();
    expect(screen.getByText("Operation A")).toBeDefined();
    expect(screen.getByText("Service A")).toBeDefined();
    expect(screen.getByRole("link", { name: /Operation A/ })).toHaveAttribute("href", "/el/op-a");
    expect(screen.getByRole("link", { name: /Service A/ })).toHaveAttribute("href", "/el/svc-a");
    expect(screen.getByRole("link", { name: /Όλες οι επεμβάσεις/ })).toHaveAttribute(
      "href",
      "/el/epemvaseis",
    );
  });
});

describe("ContactPage", () => {
  const CONTACT_PAGE: PageDTO = {
    ...BASE_PAGE,
    pageType: "contact",
    layoutVariant: "contact",
    title: "Contact Us",
    sections: [
      {
        __component: "sections.contact" as const,
        heading: "Get in Touch",
        intro: null,
        details: [
          { type: "phone", valueHtml: "<p>+30 210 123 4567</p>" },
          { type: "email", valueHtml: "<p>info@clinic.com</p>" },
        ],
        clinics: [
          {
            name: "Athens",
            addressHtml: "<p>123 Main St</p>",
            phone: "+30 210 000",
            email: null,
            latitude: 37.9838,
            longitude: 23.7275,
          },
          {
            name: "Thessaloniki",
            addressHtml: "<p>456 Other St</p>",
            phone: null,
            email: "th@cl.com",
          },
        ],
      },
    ],
  };

  it("renders the contact form", () => {
    render(<ContactPage page={CONTACT_PAGE} />);
    expect(screen.getByRole("heading", { name: "Στείλτε μήνυμα" })).toBeDefined();
    expect(screen.getByLabelText("Επισύναψη αρχείου")).toBeDefined();
    expect(screen.getByRole("button", { name: "Αποστολή" })).toBeDefined();
  });

  it("renders the section details inside the contact details column", () => {
    render(<ContactPage page={CONTACT_PAGE} />);
    expect(screen.getByText("+30 210 123 4567")).toBeDefined();
    expect(screen.getByText("info@clinic.com")).toBeDefined();
  });

  it("renders the split-screen layout wrapper", () => {
    const { container } = render(<ContactPage page={CONTACT_PAGE} />);
    expect(container.querySelector("[data-contact-split]")).toBeTruthy();
  });

  it("renders each clinic as an accordion toggle", () => {
    render(<ContactPage page={CONTACT_PAGE} />);
    expect(screen.getByRole("button", { name: /Athens/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: /Thessaloniki/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("keeps the loaded map stable when expanding clinic panels", () => {
    const { container } = render(<ContactPage page={CONTACT_PAGE} />);
    // Map is click-to-load: activate it before asserting on the iframe.
    fireEvent.click(screen.getByRole("button", { name: "Εμφάνιση χάρτη" }));
    const map = container.querySelector("iframe");
    expect(map).toBeTruthy();
    const initialSrc = map!.getAttribute("src");

    const athensToggle = screen.getByRole("button", { name: /Athens/ });
    fireEvent.click(athensToggle);
    expect(athensToggle).toHaveAttribute("aria-expanded", "true");

    const thessToggle = screen.getByRole("button", { name: /Thessaloniki/ });
    fireEvent.click(thessToggle);

    expect(container.querySelector("iframe")!.getAttribute("src")).toBe(initialSrc);
  });

  it("loads the contact map only after the visitor activates the facade", () => {
    const { container } = render(<ContactPage page={CONTACT_PAGE} />);
    // No Google iframe on first paint — only the click-to-load facade.
    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Εμφάνιση χάρτη" }));
    expect(container.querySelector("iframe")).toBeTruthy();
  });

  it("renders phone/email links with tel: and mailto: schemes inside the expanded panel", () => {
    render(<ContactPage page={CONTACT_PAGE} />);

    fireEvent.click(screen.getByRole("button", { name: /Athens/ }));
    const phoneLink = screen.getByRole("link", { name: "+30 210 000" });
    expect(phoneLink).toHaveAttribute("href", "tel:+30210000");

    fireEvent.click(screen.getByRole("button", { name: /Thessaloniki/ }));
    const emailLink = screen.getByRole("link", { name: "th@cl.com" });
    expect(emailLink).toHaveAttribute("href", "mailto:th@cl.com");
  });

  it("renders the map from clinic coordinates per ADR-009", () => {
    const { container } = render(<ContactPage page={CONTACT_PAGE} />);
    fireEvent.click(screen.getByRole("button", { name: "Εμφάνιση χάρτη" }));
    const map = container.querySelector("iframe");
    expect(map?.getAttribute("src")).toContain("37.9838");
  });

  it("hides the map block when clinics have no usable location data", () => {
    const page: PageDTO = {
      ...CONTACT_PAGE,
      sections: [
        {
          __component: "sections.contact" as const,
          heading: null,
          intro: null,
          details: [{ type: "phone", valueHtml: "<p>555</p>" }],
          clinics: [{ name: "Empty", addressHtml: "", phone: null, email: null }],
        },
      ],
    };
    const { container } = render(<ContactPage page={page} />);
    expect(screen.queryByRole("button", { name: "Εμφάνιση χάρτη" })).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renders only the contact form when CMS contact section is missing", () => {
    const page: PageDTO = { ...CONTACT_PAGE, sections: [] };
    render(<ContactPage page={page} />);
    expect(screen.getByRole("heading", { name: "Στείλτε μήνυμα" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Διεύθυνση" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Λεωφόρος Αλεξάνδρας 201/ })).toBeNull();
  });

  it("does not render a hero image even when CMS provides featuredImage", () => {
    const page: PageDTO = {
      ...CONTACT_PAGE,
      featuredImage: {
        url: "http://localhost:1337/uploads/otoplastiki_c130f8d656.jpg",
        alternativeText: "Wrong image",
        width: 1200,
        height: 800,
      },
    };
    const { container } = render(<ContactPage page={page} />);
    expect(container.querySelector("header img")).toBeNull();
  });

  it("does not render any <StructuredData> tags (composer is the single entry point)", () => {
    const { container } = render(<ContactPage page={CONTACT_PAGE} />);
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});

describe("GalleryPage", () => {
  it("renders with gallery items", () => {
    const galleryPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "gallery",
      layoutVariant: "clinic-gallery",
      title: "Gallery",
      sections: [
        {
          __component: "sections.gallery",
          items: [
            {
              caption: "Photo 1",
              image: { url: "/img/1.jpg", alternativeText: "Pic 1", width: 800, height: 600 },
            },
          ],
        },
      ],
    };

    render(<GalleryPage page={galleryPage} />);
    expect(screen.getByRole("button", { name: "Pic 1" })).toBeDefined();
  });

  it("renders multiple gallery items through SectionRenderer", () => {
    const galleryPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "gallery",
      layoutVariant: "clinic-gallery",
      title: "Gallery",
      sections: [
        {
          __component: "sections.gallery",
          heading: "Our Work",
          items: [
            {
              caption: "Photo A",
              image: { url: "/img/a.jpg", alternativeText: "Image A", width: 800, height: 600 },
            },
            {
              caption: "Photo B",
              image: { url: "/img/b.jpg", alternativeText: "Image B", width: 800, height: 600 },
            },
          ],
        },
      ],
    };

    render(<GalleryPage page={galleryPage} />);
    expect(screen.getByRole("button", { name: "Image A" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Image B" })).toBeDefined();
    expect(screen.getByText("Our Work")).toBeDefined();
  });

  it("renders gallery items as clickable buttons for lightbox", () => {
    const galleryPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "gallery",
      layoutVariant: "clinic-gallery",
      title: "Gallery",
      sections: [
        {
          __component: "sections.gallery",
          items: [
            {
              caption: "Photo 1",
              image: { url: "/img/1.jpg", alternativeText: "Pic 1", width: 800, height: 600 },
            },
          ],
        },
      ],
    };

    const { container } = render(<GalleryPage page={galleryPage} />);
    const clickable = container.querySelector("button[data-gallery-trigger]");
    expect(clickable).toBeTruthy();
  });

  it("skips gallery sections that have no items with images", () => {
    const galleryPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "gallery",
      layoutVariant: "clinic-gallery",
      title: "Clinic Gallery",
      sections: [
        {
          __component: "sections.gallery",
          heading: "Empty Gallery",
          items: [{ caption: "No Image", image: null }],
        },
      ],
    };

    const { container } = render(<GalleryPage page={galleryPage} />);
    expect(screen.queryByText("Empty Gallery")).toBeNull();
    expect(container.querySelector("[data-gallery-grid]")).toBeNull();
  });

  it("renders non-gallery sections even when gallery sections are empty", () => {
    const galleryPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "gallery",
      layoutVariant: "clinic-gallery",
      title: "Clinic Gallery",
      content: "<p>Clinic intro text</p>",
      sections: [
        {
          __component: "sections.gallery",
          heading: "Empty Gallery",
          items: [],
        },
      ],
    };

    render(<GalleryPage page={galleryPage} />);
    expect(screen.getByText("Clinic intro text")).toBeDefined();
  });

  it("renders the official site button when externalUrl is set", () => {
    const galleryPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "gallery",
      layoutVariant: "clinic-gallery",
      title: "Hospital Gallery",
      externalUrl: "https://www.mediterraneohospital.gr",
      sections: [],
    };

    render(<GalleryPage page={galleryPage} />);
    expect(screen.getByRole("link", { name: "Επίσημος ιστότοπος" })).toHaveAttribute(
      "href",
      "https://www.mediterraneohospital.gr",
    );
  });

  it("does not render the official site button when externalUrl is absent", () => {
    const galleryPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "gallery",
      layoutVariant: "clinic-gallery",
      title: "Hospital Gallery",
      externalUrl: null,
      sections: [],
    };

    render(<GalleryPage page={galleryPage} />);
    expect(screen.queryByRole("link", { name: "Επίσημος ιστότοπος" })).toBeNull();
  });
});

const CLINIC_GALLERY_ITEMS = [
  {
    caption: null,
    image: { url: "/uploads/img1.jpg", alternativeText: "Clinic", width: 800, height: 600 },
  },
  {
    caption: null,
    image: { url: "/uploads/img2.jpg", alternativeText: "Clinic 2", width: 800, height: 600 },
  },
];

function makeClinicChildPage(
  slug: "iatreio-alexandras" | "iatreio-koukaki",
  title: string,
): PageDTO {
  return {
    ...BASE_PAGE,
    slug,
    title,
    pageType: "gallery",
    layoutVariant: "office-gallery",
    parentPage: { documentId: "hub", slug: "iatreio", title: "ΛΟΡ Καμπίνετ", featuredImage: null },
    sections: [{ __component: "sections.gallery", items: CLINIC_GALLERY_ITEMS }],
    content: "<p>Clinic location copy</p>",
  };
}

describe("ClinicLocationBlock", () => {
  it("renders gallery triggers, prose, and booking CTA without a separate gallery page link", () => {
    const page = makeClinicChildPage("iatreio-koukaki", "Κουκάκι");
    const { container } = render(
      <ClinicLocationBlock page={page} appointmentHref="/el/rantevou" />,
    );

    expect(screen.getByRole("heading", { name: "Κουκάκι" })).toBeDefined();
    expect(screen.getByText("Clinic location copy")).toBeDefined();
    expect(screen.getByRole("link", { name: "Κλείστε ραντεβού ηλεκτρονικά" })).toHaveAttribute(
      "href",
      "/el/rantevou",
    );
    expect(screen.queryByRole("link", { name: "Δείτε τη γκαλερί" })).toBeNull();
    expect(container.querySelectorAll("button[data-gallery-trigger]")).toHaveLength(2);
    expect(container.querySelector("#clinic-iatreio-koukaki")).toBeTruthy();
  });
});

describe("ClinicHubPage", () => {
  it("renders parent intro and both clinic location blocks", async () => {
    const hubPage: PageDTO = {
      ...BASE_PAGE,
      slug: "iatreio",
      title: "ΛΟΡ Ιατρείο",
      layoutVariant: "standard",
      content: "<p>Doctor bio intro</p>",
      sections: [],
    };
    const alexandras = makeClinicChildPage("iatreio-alexandras", "Αμπελόκηποι");
    const koukaki = makeClinicChildPage("iatreio-koukaki", "Κουκάκι");

    vi.mocked(getPage).mockImplementation(async (_locale, slug) => {
      if (slug === "iatreio-alexandras") return alexandras;
      if (slug === "iatreio-koukaki") return koukaki;
      throw new Error(`Unexpected slug ${slug}`);
    });

    const ui = await ClinicHubPage({
      page: hubPage,
      appointmentHref: "/el/rantevou",
      globalSettings: MOCK_GLOBAL_SETTINGS,
    });
    const { container } = render(ui);

    expect(screen.getByText("Doctor bio intro")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Αμπελόκηποι" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Κουκάκι" })).toBeDefined();
    expect(screen.getAllByRole("link", { name: "Κλείστε ραντεβού ηλεκτρονικά" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Αμπελόκηποι" })).toHaveAttribute(
      "href",
      "#clinic-iatreio-alexandras",
    );
    expect(screen.getByRole("link", { name: "Κουκάκι" })).toHaveAttribute(
      "href",
      "#clinic-iatreio-koukaki",
    );
    expect(container.querySelectorAll("button[data-gallery-trigger]")).toHaveLength(4);
  });

  it("renders visit/contact section with address, phone, and email", async () => {
    const hubPage: PageDTO = {
      ...BASE_PAGE,
      slug: "iatreio",
      title: "ΛΟΡ Ιατρείο",
      layoutVariant: "standard",
      content: "<p>Doctor bio intro</p>",
      sections: [],
    };
    const alexandras = makeClinicChildPage("iatreio-alexandras", "Αμπελόκηποι");
    const koukaki = makeClinicChildPage("iatreio-koukaki", "Κουκάκι");

    vi.mocked(getPage).mockImplementation(async (_locale, slug) => {
      if (slug === "iatreio-alexandras") return alexandras;
      if (slug === "iatreio-koukaki") return koukaki;
      throw new Error(`Unexpected slug ${slug}`);
    });

    const ui = await ClinicHubPage({
      page: hubPage,
      appointmentHref: "/el/rantevou",
      globalSettings: MOCK_GLOBAL_SETTINGS,
    });
    render(ui);

    const addressNodes = screen.getAllByText(
      "Λεωφόρος Αλεξάνδρας 201 & Πανόρμου, Αμπελόκηποι, Αθήνα",
    );
    expect(addressNodes.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "211-01 94 618" })).toHaveAttribute(
      "href",
      "tel:+302110194618",
    );
    expect(screen.getByRole("link", { name: "pavlos.tsolaridis@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:pavlos.tsolaridis@gmail.com",
    );
  });

  it("renders doctor identity when globalSettings has doctor fields", async () => {
    const hubPage: PageDTO = {
      ...BASE_PAGE,
      slug: "iatreio",
      title: "ΛΟΡ Ιατρείο",
      layoutVariant: "standard",
      content: null,
      sections: [],
    };
    const alexandras = makeClinicChildPage("iatreio-alexandras", "Αμπελόκηποι");
    const koukaki = makeClinicChildPage("iatreio-koukaki", "Κουκάκι");

    vi.mocked(getPage).mockImplementation(async (_locale, slug) => {
      if (slug === "iatreio-alexandras") return alexandras;
      if (slug === "iatreio-koukaki") return koukaki;
      throw new Error(`Unexpected slug ${slug}`);
    });

    const settingsWithDoctor: GlobalSettingsDTO = {
      ...MOCK_GLOBAL_SETTINGS,
      doctorName: "Παύλος Τσολαρίδης",
      doctorSpecialty: "Ωτορινολαρυγγολόγος",
    };

    const ui = await ClinicHubPage({
      page: hubPage,
      appointmentHref: "/el/rantevou",
      globalSettings: settingsWithDoctor,
    });
    render(ui);

    expect(screen.getByText("Παύλος Τσολαρίδης")).toBeDefined();
    expect(screen.getByText("Ωτορινολαρυγγολόγος")).toBeDefined();
  });

  it("renders map facade button with show-map label", async () => {
    const hubPage: PageDTO = {
      ...BASE_PAGE,
      slug: "iatreio",
      title: "ΛΟΡ Ιατρείο",
      layoutVariant: "standard",
      content: null,
      sections: [],
    };
    const alexandras = makeClinicChildPage("iatreio-alexandras", "Αμπελόκηποι");
    const koukaki = makeClinicChildPage("iatreio-koukaki", "Κουκάκι");

    vi.mocked(getPage).mockImplementation(async (_locale, slug) => {
      if (slug === "iatreio-alexandras") return alexandras;
      if (slug === "iatreio-koukaki") return koukaki;
      throw new Error(`Unexpected slug ${slug}`);
    });

    const ui = await ClinicHubPage({
      page: hubPage,
      appointmentHref: "/el/rantevou",
      globalSettings: MOCK_GLOBAL_SETTINGS,
    });
    render(ui);

    expect(screen.getByRole("button", { name: "Εμφάνιση χάρτη" })).toBeDefined();
  });

  it("uses accent hero image variant for controlled office image sizing", async () => {
    const hubPage: PageDTO = {
      ...BASE_PAGE,
      slug: "iatreio",
      title: "ΛΟΡ Ιατρείο",
      layoutVariant: "standard",
      content: null,
      sections: [],
      imageCenter: {
        url: "/uploads/office.jpg",
        alternativeText: "Office photo",
        width: 1200,
        height: 800,
      },
    };
    const alexandras = makeClinicChildPage("iatreio-alexandras", "Αμπελόκηποι");
    const koukaki = makeClinicChildPage("iatreio-koukaki", "Κουκάκι");

    vi.mocked(getPage).mockImplementation(async (_locale, slug) => {
      if (slug === "iatreio-alexandras") return alexandras;
      if (slug === "iatreio-koukaki") return koukaki;
      throw new Error(`Unexpected slug ${slug}`);
    });

    const ui = await ClinicHubPage({
      page: hubPage,
      appointmentHref: "/el/rantevou",
      globalSettings: MOCK_GLOBAL_SETTINGS,
    });
    const { container } = render(ui);

    // Accent image uses band variant - constrained width with accent modifier class
    const heroImage = container.querySelector("[class*='page-hero__image--accent']");
    expect(heroImage).toBeTruthy();
  });

  it("hides visit section when globalSettings has no address", async () => {
    const hubPage: PageDTO = {
      ...BASE_PAGE,
      slug: "iatreio",
      title: "LOR Kabinet",
      locale: "ru",
      layoutVariant: "standard",
      content: null,
      sections: [],
    };
    const alexandras = makeClinicChildPage("iatreio-alexandras", "Ampelokipi");
    const koukaki = makeClinicChildPage("iatreio-koukaki", "Koukaki");

    vi.mocked(getPage).mockImplementation(async (_locale, slug) => {
      if (slug === "iatreio-alexandras") return alexandras;
      if (slug === "iatreio-koukaki") return koukaki;
      throw new Error(`Unexpected slug ${slug}`);
    });

    const emptySettings: GlobalSettingsDTO = {
      ...MOCK_GLOBAL_SETTINGS,
      locale: "ru",
      address: null,
      phoneTel: null,
      phoneDisplay: null,
      secondaryPhoneTel: null,
      secondaryPhoneDisplay: null,
      email: null,
    };

    const ui = await ClinicHubPage({
      page: hubPage,
      appointmentHref: "/ru/zapis",
      globalSettings: emptySettings,
    });
    render(ui);

    expect(screen.queryByRole("button", { name: "Показать карту" })).toBeNull();
  });
});

describe("QuestionListPage", () => {
  it("renders FAQ items through SectionRenderer", () => {
    const faqPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "faq",
      layoutVariant: "service-faq",
      title: "FAQ",
      sections: [
        {
          __component: "sections.faq",
          items: [{ question: "What is ORL?", answer: "ENT medicine" }],
        },
      ],
    };

    render(<QuestionListPage page={faqPage} />);
    expect(screen.getByText("What is ORL?")).toBeDefined();
    expect(screen.queryByText("service faq")).toBeNull();
  });

  it("renders appointment closure band without layout-variant kicker", () => {
    const faqPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "accordion",
      layoutVariant: "service-accordion",
      title: "Child Anesthesia",
      sections: [
        {
          __component: "sections.accordion",
          items: [{ title: "Intro", content: "<p>Body</p>" }],
        },
      ],
    };

    render(
      <QuestionListPage
        page={faqPage}
        navigation={[makeNav("appointment", "Appointment", 99)]}
        appointmentHref="/el/rantevou"
      />,
    );

    expect(
      screen.getByText("Έχετε ακόμη απορίες; Κλείστε ραντεβού για να τις συζητήσουμε."),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Κλείσε ραντεβού" })).toHaveAttribute(
      "href",
      "/el/rantevou",
    );
    expect(screen.queryByText("service accordion")).toBeNull();
  });

  it("renders breadcrumbs when parentPage is set", () => {
    const faqPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "accordion",
      layoutVariant: "service-accordion",
      title: "Child Anesthesia",
      parentPage: {
        documentId: "parent-1",
        slug: "pediatric-orl",
        title: "Pediatric ORL",
      },
      sections: [
        {
          __component: "sections.accordion",
          items: [{ title: "Intro", content: "<p>Body</p>" }],
        },
      ],
    };

    render(<QuestionListPage page={faqPage} />);

    expect(screen.getByRole("navigation", { name: "Breadcrumbs" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Pediatric ORL" })).toHaveAttribute(
      "href",
      "/el/pediatric-orl",
    );
  });

  it("renders multiple section types through SectionRenderer", () => {
    const faqPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "content",
      layoutVariant: "standard",
      title: "Mixed Content",
      sections: [
        {
          __component: "sections.faq",
          heading: "FAQ",
          items: [{ question: "Q1", answer: "A1" }],
        },
        {
          __component: "sections.accordion",
          heading: "Details",
          items: [{ title: "Topic", content: "Body" }],
        },
      ],
    };

    render(<QuestionListPage page={faqPage} />);
    expect(screen.getByText("Q1")).toBeDefined();
    expect(screen.getByText("Topic")).toBeDefined();
  });
});

describe("FrontendNativePage", () => {
  it("renders without crashing", () => {
    const nativePage: PageDTO = {
      ...BASE_PAGE,
      renderMode: "frontend-native",
      title: "Native Page",
    };

    render(<FrontendNativePage page={nativePage} />);
    expect(screen.getByText("Native Page")).toBeDefined();
  });

  it("renders nested Human Site Map links from directory navigation", () => {
    const nativePage: PageDTO = {
      ...BASE_PAGE,
      renderMode: "frontend-native",
      layoutVariant: "sitemap",
      slug: "sitemap",
      title: "Sitemap",
    };
    const directoryNavigation: NavigationNodeDTO[] = [
      {
        ...makeNav("menu", "Menu"),
        children: [makeNav("services", "Services", 1), makeNav("sitemap", "Sitemap", 2)],
      },
      makeNav("404", "404", 0),
    ];
    directoryNavigation[1] = {
      ...directoryNavigation[1]!,
      layoutVariant: "not-found",
      hideFromMenu: true,
    };

    render(<FrontendNativePage page={nativePage} directoryNavigation={directoryNavigation} />);

    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute("href", "/el/services");
    expect(screen.queryByRole("link", { name: "Sitemap" })).toBeNull();
    expect(screen.queryByRole("link", { name: "404" })).toBeNull();
  });
});

describe("SectionIndexPage", () => {
  it("renders page title and content", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "section-index",
      isFolder: true,
      title: "Diseases",
      content: "<p>Browse our conditions library</p>",
    };
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("diseases", "Diseases"),
        isFolder: true,
        children: [makeNav("rhinitis", "Rhinitis", 1), makeNav("sinusitis", "Sinusitis", 2)],
      },
    ];

    render(<SectionIndexPage page={page} navigation={nav} />);

    expect(screen.getByRole("heading", { name: "Diseases" })).toBeDefined();
    expect(screen.getByText("Browse our conditions library")).toBeDefined();
  });

  it("renders child page links from navigation tree", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-diseases",
      layoutVariant: "section-index",
      isFolder: true,
      title: "Diseases",
      slug: "diseases",
    };
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("diseases", "Diseases"),
        isFolder: true,
        children: [makeNav("rhinitis", "Rhinitis", 1), makeNav("sinusitis", "Sinusitis", 2)],
      },
    ];

    render(<SectionIndexPage page={page} navigation={nav} />);

    expect(screen.getByRole("link", { name: /Rhinitis/ })).toHaveAttribute("href", "/el/rhinitis");
    expect(screen.getByRole("link", { name: /Sinusitis/ })).toHaveAttribute(
      "href",
      "/el/sinusitis",
    );
  });

  it("renders an empty state for child grid when no navigation match", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "section-index",
      isFolder: true,
      title: "Orphan",
    };

    render(<SectionIndexPage page={page} navigation={[]} />);

    expect(screen.getByText("Δεν υπάρχουν ακόμη διαθέσιμες σελίδες.")).toBeDefined();
  });

  it("renders breadcrumb links when a parent page is set", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-diagnosi",
      layoutVariant: "section-index",
      isFolder: true,
      title: "Διάγνωση",
      slug: "diagnosi",
      parentPage: {
        documentId: "doc-yperesies",
        slug: "yperesies",
        title: "Υπηρεσίες",
      },
    };
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("diagnosi", "Διάγνωση"),
        documentId: "nav-diagnosi",
        isFolder: true,
        children: [makeNav("exam", "Exam", 1)],
      },
    ];

    render(<SectionIndexPage page={page} navigation={nav} />);

    const crumbs = screen.getByRole("navigation", { name: "Breadcrumbs" });
    expect(within(crumbs).getByRole("link", { name: "Αρχική" })).toHaveAttribute("href", "/el");
    expect(within(crumbs).getByRole("link", { name: "Υπηρεσίες" })).toHaveAttribute(
      "href",
      "/el/yperesies",
    );
  });

  it("renders a localized appointment closure band", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-diagnosi",
      layoutVariant: "section-index",
      isFolder: true,
      title: "Διάγνωση",
      slug: "diagnosi",
    };
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("diagnosi", "Διάγνωση"),
        isFolder: true,
        children: [makeNav("exam", "Exam", 1)],
      },
      makeNav("rantevou", "Online ραντεβού"),
    ];

    render(<SectionIndexPage page={page} navigation={nav} />);

    expect(
      screen.getByText(
        "Δεν είστε σίγουροι ποια εξέταση χρειάζεστε; Θα σας καθοδηγήσουμε στο ραντεβού.",
      ),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Κλείστε ραντεβού" })).toHaveAttribute(
      "href",
      "/el/rantevou",
    );
  });

  it("renders VideoDirectoryPage with video entries", async () => {
    const { VideoDirectoryPageWithEntries } = await import("./VideoDirectoryPage");
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-videos",
      layoutVariant: "video-index",
      isFolder: true,
      title: "Videos",
      slug: "video",
    };

    render(
      <VideoDirectoryPageWithEntries
        page={page}
        navigation={[]}
        entries={[
          {
            documentId: "video-1",
            locale: "el",
            title: "Clinic Tour",
            youtubeId: "abc123",
            youtubeUrl: null,
            categories: [{ slug: "ρινος", label: "Ρινός" }],
            sortOrder: 1,
            relatedArticle: { documentId: "p1", slug: "tour", title: "Tour" },
            legacyArticleUrl: null,
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Videos" })).toBeDefined();
    expect(screen.getByText("Clinic Tour")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Διαβάστε περισσότερα για το θέμα" })).toBeNull();

    fireEvent.click(screen.getByText("Clinic Tour"));

    expect(screen.getByRole("link", { name: "Διαβάστε περισσότερα για το θέμα" })).toHaveAttribute(
      "href",
      "/el/tour",
    );
  });

  it("renders tag filter pills derived from child navigation tags", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-hub",
      layoutVariant: "section-index",
      isFolder: true,
      title: "Face surgery",
      slug: "hub",
    };
    const ear = { name: "Ear", slug: "ear" };
    const nose = { name: "Nose", slug: "nose" };
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("hub", "Face surgery"),
        documentId: "nav-hub",
        isFolder: true,
        children: [
          { ...makeNav("oto", "Otoplasty", 1), tags: [ear] },
          { ...makeNav("rhino", "Rhinoplasty", 2), tags: [nose, ear] },
        ],
      },
    ];

    render(<SectionIndexPage page={page} navigation={nav} />);

    expect(screen.getByRole("button", { name: "Όλα" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Ear" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Nose" })).toBeDefined();
  });
});

describe("SectionHubPage", () => {
  it("renders page header as fallback when folder has no children in tree", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "doc-rinoplastiki",
      layoutVariant: "section-hub",
      isFolder: true,
      title: "Rhinoplasty",
      slug: "rinoplastiki",
    };

    // Empty tree — findNodeByDocumentId returns null, no first child
    render(<SectionHubPage page={page} navigation={[]} />);

    expect(screen.getByRole("heading", { name: "Rhinoplasty" })).toBeDefined();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("renders page title and tab bar for a section-hub child page", () => {
    const children = [
      makeNav("rinoplastiki-eisagogi", "Introduction"),
      makeNav("sygxroni-leitourgiki-rinoplastiki", "Modern Techniques"),
      makeNav("vimata-sti-xeirourgiki-rinoplastikis", "Surgical Steps"),
    ];
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("rinoplastiki", "Rhinoplasty"),
        documentId: "doc-rinoplastiki",
        isFolder: true,
        layoutVariant: "section-hub",
        children,
      },
    ];
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-rinoplastiki-eisagogi",
      layoutVariant: "service-article",
      isFolder: false,
      title: "Introduction",
      slug: "rinoplastiki-eisagogi",
      parentPage: { documentId: "doc-rinoplastiki", slug: null, title: null },
    };

    render(<SectionHubPage page={page} navigation={nav} />);

    expect(screen.getByRole("heading", { name: "Introduction" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Modern Techniques" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Surgical Steps" })).toBeDefined();
    expect(document.querySelector("main[data-hub-child='true']")).toBeTruthy();
  });

  it("renders sources footer on section-hub encyclopedia child when sources are set", () => {
    const children = [makeNav("plasticheskaia-xeirourgia-otoplastika", "Otoplasty surgery")];
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("otoplastika-v-athinah", "Otoplasty"),
        documentId: "doc-otoplastika-hub",
        isFolder: true,
        layoutVariant: "section-hub",
        children,
      },
    ];
    const page: PageDTO = {
      ...BASE_PAGE,
      locale: "ru",
      documentId: "nav-plasticheskaia-xeirourgia-otoplastika",
      layoutVariant: "encyclopedia-article",
      isFolder: false,
      title: "Otoplasty surgery",
      slug: "plasticheskaia-xeirourgia-otoplastika",
      parentPage: { documentId: "doc-otoplastika-hub", slug: null, title: null },
      sources: '<p><a href="https://pubmed.ncbi.nlm.nih.gov/29153192/">PubMed</a></p>',
    };

    render(<SectionHubPage page={page} navigation={nav} />);

    expect(screen.getByRole("region", { name: "Источники" })).toBeDefined();
    expect(screen.getByRole("link", { name: "PubMed" })).toBeDefined();
  });

  it("renders tab bar for blefaroplastika section-hub child pages", () => {
    const children = [
      makeNav("blefaroplastika-v-athinah", "Blepharoplasty"),
      makeNav("lazernaia-blefaroplastika", "Laser blepharoplasty"),
    ];
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("blefaroplastika-plastika-glaz", "Blepharoplasty hub"),
        documentId: "doc-blefaroplastika-hub",
        isFolder: true,
        layoutVariant: "section-hub",
        children,
      },
    ];
    const page: PageDTO = {
      ...BASE_PAGE,
      locale: "ru",
      documentId: "nav-blefaroplastika-v-athinah",
      layoutVariant: "encyclopedia-article",
      isFolder: false,
      title: "Blepharoplasty",
      slug: "blefaroplastika-v-athinah",
      parentPage: { documentId: "doc-blefaroplastika-hub", slug: null, title: null },
    };

    render(<SectionHubPage page={page} navigation={nav} />);

    expect(screen.getByRole("heading", { name: "Blepharoplasty" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Laser blepharoplasty" })).toBeDefined();
    expect(screen.queryByText(/←/)).toBeNull();
  });

  it("renders sources footer on blefaroplastika section-hub child when sources are set", () => {
    const children = [makeNav("blefaroplastika-v-athinah", "Blepharoplasty")];
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("blefaroplastika-plastika-glaz", "Blepharoplasty hub"),
        documentId: "doc-blefaroplastika-hub",
        isFolder: true,
        layoutVariant: "section-hub",
        children,
      },
    ];
    const page: PageDTO = {
      ...BASE_PAGE,
      locale: "ru",
      documentId: "nav-blefaroplastika-v-athinah",
      layoutVariant: "encyclopedia-article",
      isFolder: false,
      title: "Blepharoplasty",
      slug: "blefaroplastika-v-athinah",
      parentPage: { documentId: "doc-blefaroplastika-hub", slug: null, title: null },
      sources:
        '<p><a href="https://pubmed.ncbi.nlm.nih.gov/20300364/">Blepharoplasty overview</a></p>',
    };

    render(<SectionHubPage page={page} navigation={nav} />);

    expect(screen.getByRole("region", { name: "Источники" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Blepharoplasty overview" })).toBeDefined();
  });

  it("renders tab bar for otoplastika section-hub child pages", () => {
    const children = [
      makeNav("plasticheskaia-xeirourgia-otoplastika", "Otoplasty surgery"),
      makeNav("novaia-otoplastika-bez-razrezov", "No-incision otoplasty"),
      makeNav("voprosi-otvei-otoplastika", "FAQ"),
    ];
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("otoplastika-v-athinah", "Otoplasty"),
        documentId: "doc-otoplastika-hub",
        isFolder: true,
        layoutVariant: "section-hub",
        children,
      },
    ];
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-plasticheskaia-xeirourgia-otoplastika",
      layoutVariant: "encyclopedia-article",
      isFolder: false,
      title: "Otoplasty surgery",
      slug: "plasticheskaia-xeirourgia-otoplastika",
      parentPage: { documentId: "doc-otoplastika-hub", slug: null, title: null },
    };

    render(<SectionHubPage page={page} navigation={nav} />);

    expect(screen.getByRole("heading", { name: "Otoplasty surgery" })).toBeDefined();
    expect(screen.getByRole("link", { name: "No-incision otoplasty" })).toBeDefined();
    expect(screen.getByRole("link", { name: "FAQ" })).toBeDefined();
    expect(screen.queryByText(/←/)).toBeNull();
  });

  it("does not render a back-link for section-hub child page", () => {
    const children = [makeNav("child-a", "Child A"), makeNav("child-b", "Child B")];
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("folder", "Folder"),
        documentId: "doc-folder",
        isFolder: true,
        layoutVariant: "section-hub",
        children,
      },
    ];
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-child-a",
      layoutVariant: "service-article",
      isFolder: false,
      title: "Child A",
      slug: "child-a",
      parentPage: { documentId: "doc-folder", slug: null, title: null },
    };

    render(<SectionHubPage page={page} navigation={nav} />);

    expect(screen.queryByText(/←/)).toBeNull();
    expect(screen.getByRole("navigation")).toBeDefined();
  });

  it("renders without navigation prop (empty state)", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "section-hub",
      isFolder: true,
      title: "Orphan Hub",
    };

    render(<SectionHubPage page={page} />);

    expect(screen.getByRole("heading", { name: "Orphan Hub" })).toBeDefined();
    // No tab bar when getTabBarConfig returns null (orphan)
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("marks the active child tab with aria-current", () => {
    const children = [makeNav("child-a", "Child A"), makeNav("child-b", "Child B")];
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("folder", "Folder"),
        documentId: "doc-folder",
        isFolder: true,
        layoutVariant: "section-hub",
        children,
      },
    ];
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-child-a",
      layoutVariant: "service-article",
      isFolder: false,
      title: "Child A",
      slug: "child-a",
      parentPage: { documentId: "doc-folder", slug: null, title: null },
    };

    render(<SectionHubPage page={page} navigation={nav} />);

    const selfTab = screen.getByRole("link", { name: "Child A" });
    expect(selfTab.getAttribute("aria-current")).toBe("page");
  });

  it("shows More dropdown when siblings exceed maxVisible", () => {
    const children = Array.from({ length: 12 }, (_, i) => makeNav(`child-${i}`, `Child ${i}`));
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("folder", "Folder"),
        documentId: "doc-folder",
        isFolder: true,
        layoutVariant: "section-hub",
        children,
      },
    ];
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-child-8",
      layoutVariant: "service-article",
      isFolder: false,
      title: "Child 8",
      slug: "child-8",
      parentPage: { documentId: "doc-folder", slug: null, title: null },
    };

    render(<SectionHubPage page={page} navigation={nav} />);

    const moreButton = screen.getByRole("button", { name: /Περισσότερα/ });
    expect(moreButton).toBeDefined();
  });

  it("renders page body content below the tab bar", () => {
    const children = [
      makeNav("child-a", "Child A"),
      makeNav("child-b", "Child B"),
      makeNav("child-c", "Child C"),
    ];
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("folder", "Folder"),
        documentId: "doc-folder",
        isFolder: true,
        layoutVariant: "section-hub",
        children,
      },
    ];
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-child-a",
      layoutVariant: "standard",
      isFolder: false,
      title: "Child A",
      slug: "child-a",
      content: "<p>This is the page body content</p>",
      parentPage: { documentId: "doc-folder", slug: null, title: null },
    };

    render(<SectionHubPage page={page} navigation={nav} />);

    expect(screen.getByText("This is the page body content")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Child A" })).toBeDefined();
    expect(screen.getByRole("navigation")).toBeDefined();
  });

  it("renders sections below the tab bar for section-hub child", () => {
    const children = [makeNav("child-a", "Child A")];
    const nav: NavigationNodeDTO[] = [
      {
        ...makeNav("folder", "Folder"),
        documentId: "doc-folder",
        isFolder: true,
        layoutVariant: "section-hub",
        children,
      },
    ];
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-child-a",
      layoutVariant: "standard",
      isFolder: false,
      title: "Child A",
      slug: "child-a",
      content: "<p>Intro</p>",
      parentPage: { documentId: "doc-folder", slug: null, title: null },
      sections: [
        {
          __component: "sections.faq",
          heading: "FAQ",
          items: [{ question: "A question?", answer: "An answer" }],
        },
      ],
    };

    render(<SectionHubPage page={page} navigation={nav} />);

    expect(screen.getByText("A question?")).toBeDefined();
  });
});

describe("PageBody", () => {
  it("renders default prose content and sections", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "standard",
      content: "<p>Default body</p>",
      sections: [
        {
          __component: "sections.faq",
          heading: "FAQ",
          items: [{ question: "Q", answer: "A" }],
        },
      ],
      infoBlockBottom: "<p>Note</p>",
      sources: "<p>Sources</p>",
    };

    render(<PageBody page={page} />);

    expect(screen.getByText("Default body")).toBeDefined();
    expect(screen.getByText("Q")).toBeDefined();
    expect(screen.getByText("Note")).toBeDefined();
    expect(screen.getByText("Sources")).toBeDefined();
  });

  it("renders service-article body with service layout", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "service-article",
      content: "<p>Service content</p>",
      sections: [
        {
          __component: "sections.faq",
          heading: "What to expect",
          items: [{ question: "How long?", answer: "<p>One visit</p>" }],
        },
      ],
    };

    const { rerender } = render(<PageBody page={page} />);

    let main = document.querySelector("[data-service-layout='true']");
    expect(main).toBeTruthy();
    expect(main?.getAttribute("data-hub-child")).toBeNull();

    rerender(<PageBody page={page} hubChild />);
    main = document.querySelector("[data-service-layout='true']");
    expect(main?.getAttribute("data-hub-child")).toBe("true");

    expect(screen.getByText("Service content").closest("div")?.getAttribute("data-variant")).toBe(
      "service",
    );
    const serviceAside = document.querySelector("[data-service-layout='true'] aside");
    expect(serviceAside).toBeTruthy();
    expect(
      within(serviceAside as HTMLElement).getByRole("link", { name: "What to expect" }),
    ).toHaveAttribute("href", "#section-1");
  });

  it("renders service-article content TOC when sections are empty", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "service-article",
      content: "<p>Intro</p><h3>Symptoms</h3><p>Details</p><h3>Treatment</h3><p>More</p>",
      sections: [],
      relatedTopics: [{ documentId: "r1", slug: "follow-up", title: "Follow up" }],
    };

    const { container } = render(<PageBody page={page} />);

    const serviceAside = document.querySelector("[data-service-layout='true'] aside");
    expect(serviceAside).toBeTruthy();
    const aside = serviceAside as HTMLElement;

    const contentsNav = within(aside).getByRole("navigation", { name: "Περιεχόμενα" });
    expect(within(contentsNav).getByRole("link", { name: "Symptoms" })).toHaveAttribute(
      "href",
      "#symptoms",
    );
    expect(within(contentsNav).getByRole("link", { name: "Treatment" })).toHaveAttribute(
      "href",
      "#treatment",
    );
    expect(within(aside).getByRole("link", { name: "Follow up" })).toHaveAttribute(
      "href",
      "/el/follow-up",
    );

    expect(container.querySelector("#symptoms")).toBeTruthy();
    expect(container.querySelector("#treatment")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Ενότητες" })).toBeNull();
  });

  it("renders reference article body with TOC sidebar", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "encyclopedia-article",
      content: "<h2>Diagnosis</h2><p>Reference body</p><h3>Imaging</h3>",
      relatedTopics: [
        {
          documentId: "related-nasal-guide",
          slug: "nasal-guide",
          title: "Nasal guide",
        },
      ],
    };

    render(<PageBody page={page} />);

    expect(document.querySelector("[data-article-layout='encyclopedia']")).toBeTruthy();
    expect(screen.getByText("Reference body").closest("div")?.getAttribute("data-variant")).toBe(
      "encyclopedia",
    );
    const contentsNavs = screen.getAllByRole("navigation", { name: "Περιεχόμενα" });
    expect(contentsNavs.length).toBeGreaterThanOrEqual(1);
    const contentsNavPrimary = contentsNavs[0];
    expect(contentsNavPrimary).toBeDefined();
    expect(
      within(contentsNavPrimary as HTMLElement)
        .getByRole("link", { name: "Diagnosis" })
        .getAttribute("href"),
    ).toBe("#diagnosis");
    expect(screen.getAllByRole("link", { name: "Nasal guide" }).length).toBeGreaterThanOrEqual(1);
  });

  it("renders specialized article body with author and sources in sidebar", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "specialized-article",
      content: "<h2>Evidence</h2><p>Research body</p>",
      articleAuthor: "Dr Expert, MD",
      sources: "<ol><li>Journal source</li></ol>",
    };

    render(<PageBody page={page} />);

    expect(document.querySelector("[data-article-layout='specialized']")).toBeTruthy();
    expect(screen.getByText("Research body").closest("div")?.getAttribute("data-variant")).toBe(
      "specialized",
    );
    expect(screen.getByText("Dr Expert, MD")).toBeDefined();
    expect(screen.getByText("Journal source")).toBeDefined();
  });

  it("hides medically reviewed dates on encyclopedia-article when fields are set", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "encyclopedia-article",
      content: "<h2>Diagnosis</h2><p>Reference body</p>",
      medicallyReviewedBy: "Dr Expert",
      lastReviewedDate: "2025-01-15T00:00:00.000Z",
    };

    render(<PageBody page={page} />);

    expect(document.querySelector("[class*='article-dates']")).toBeNull();
    expect(screen.queryByText(/Ιατρικά ελεγμένο/)).toBeNull();
  });

  it("hides medically reviewed dates on service-article when fields are set", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "service-article",
      content: "<p>Service content</p>",
      medicallyReviewedBy: "Dr Expert",
      lastReviewedDate: "2025-01-15T00:00:00.000Z",
    };

    render(<PageBody page={page} />);

    expect(document.querySelector("[class*='article-dates']")).toBeNull();
    expect(screen.queryByText(/Ιατρικά ελεγμένο/)).toBeNull();
  });

  it("hides medically reviewed dates on specialized-article when fields are set", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "specialized-article",
      content: "<h2>Evidence</h2><p>Research body</p>",
      medicallyReviewedBy: "Dr Expert",
      lastReviewedDate: "2025-01-15T00:00:00.000Z",
    };

    render(<PageBody page={page} />);

    expect(document.querySelector("[class*='article-dates']")).toBeNull();
    expect(screen.queryByText(/Ιατρικά ελεγμένο/)).toBeNull();
  });

  it("hides medically reviewed dates on standard layout when fields are set", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "standard",
      content: "<p>General content</p>",
      medicallyReviewedBy: "Dr Expert",
      lastReviewedDate: "2025-01-15T00:00:00.000Z",
    };

    render(<PageBody page={page} />);

    expect(document.querySelector("[class*='article-dates']")).toBeNull();
    expect(screen.queryByText(/Ιατρικά ελεγμένο/)).toBeNull();
  });
});

describe("ArticleDisclaimer", () => {
  const DISCLAIMER_TEXT = "Medical disclaimer text for testing.";

  const medicalLayouts = [
    "encyclopedia-article",
    "service-article",
    "service-faq",
    "service-accordion",
    "service-tabs",
    "specialized-article",
  ] as const;

  it.each(medicalLayouts)(
    "shows disclaimer on %s when override is default (medical layout)",
    (layoutVariant) => {
      const page: PageDTO = {
        ...BASE_PAGE,
        layoutVariant,
        disclaimerOverride: "default",
      };

      render(<PageBody page={page} disclaimerText={DISCLAIMER_TEXT} />);

      expect(screen.getByRole("note")).toBeDefined();
      expect(screen.getByText(DISCLAIMER_TEXT)).toBeDefined();
    },
  );

  it("hides disclaimer on standard layout when override is default", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "standard",
      disclaimerOverride: "default",
    };

    render(<PageBody page={page} disclaimerText={DISCLAIMER_TEXT} />);

    expect(screen.queryByRole("note")).toBeNull();
  });

  it("shows disclaimer on any layout when override is force-show", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "standard",
      disclaimerOverride: "force-show",
    };

    render(<PageBody page={page} disclaimerText={DISCLAIMER_TEXT} />);

    expect(screen.getByRole("note")).toBeDefined();
    expect(screen.getByText(DISCLAIMER_TEXT)).toBeDefined();
  });

  it("hides disclaimer on medical layout when override is force-hide", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "encyclopedia-article",
      disclaimerOverride: "force-hide",
    };

    render(<PageBody page={page} disclaimerText={DISCLAIMER_TEXT} />);

    expect(screen.queryByRole("note")).toBeNull();
  });

  it("hides disclaimer on medical layout when disclaimerText is null", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "encyclopedia-article",
      disclaimerOverride: "default",
    };

    render(<PageBody page={page} disclaimerText={null} />);

    expect(screen.queryByRole("note")).toBeNull();
  });

  it("renders aside with role note and locale-aware aria-label", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "encyclopedia-article",
      disclaimerOverride: "default",
    };

    render(<PageBody page={page} disclaimerText={DISCLAIMER_TEXT} />);

    const aside = screen.getByRole("note");
    expect(aside.tagName).toBe("ASIDE");
    expect(aside.getAttribute("aria-label")).toBe("Ιατρική αποποίηση");
  });

  it("renders russian aria-label for ru locale", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      locale: "ru",
      layoutVariant: "service-article",
      disclaimerOverride: "default",
    };

    render(<PageBody page={page} disclaimerText="Медицинский дисклеймер." />);

    expect(screen.getByRole("note").getAttribute("aria-label")).toBe("Медицинский дисклеймер");
  });
});

describe("extractHeadings", () => {
  it("extracts h2 and h3 headings with unique ids", () => {
    const html = "<h2>First</h2><p>text</p><h3>Nested</h3><h2>First</h2>";
    const headings = extractHeadings(html);
    expect(headings).toHaveLength(3);
    expect(headings[0]).toEqual({ id: "first", text: "First" });
    expect(headings[1]).toEqual({ id: "nested", text: "Nested" });
    expect(headings[2]).toEqual({ id: "first-2", text: "First" });
  });

  it("returns empty array for null html", () => {
    expect(extractHeadings(null)).toEqual([]);
  });
});

describe("addHeadingIds", () => {
  it("adds id attributes to headings without existing ids", () => {
    const html = "<h2>First</h2><p>text</p><h3>Second</h3>";
    const headings = extractHeadings(html);
    const result = addHeadingIds(html, headings);
    expect(result).toBe('<h2 id="first">First</h2><p>text</p><h3 id="second">Second</h3>');
  });

  it("skips headings that already have an id", () => {
    const html = '<h2 id="existing">Skip</h2><h2>Add</h2>';
    const headings = extractHeadings(html);
    const result = addHeadingIds(html, headings);
    expect(result).toBe('<h2 id="existing">Skip</h2><h2 id="add">Add</h2>');
  });
});

describe("relatedTopicHref", () => {
  it("builds locale-prefixed hrefs for related topics", () => {
    expect(
      relatedTopicHref({ documentId: "r1", slug: "nasal-guide", title: "Nasal guide" }, "el"),
    ).toBe("/el/nasal-guide");
    expect(relatedTopicHref({ documentId: "home", slug: "index", title: "Home" }, "el")).toBe(
      "/el",
    );
  });
});

describe("relatedTopics panel", () => {
  it("renders service-article related topics in the sidebar", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "service-article",
      content: "<p>Service content</p>",
      relatedTopics: [{ documentId: "r1", slug: "follow-up", title: "Follow up" }],
    };

    render(<PageBody page={page} />);

    const serviceAside = document.querySelector("[data-service-layout='true'] aside");
    expect(serviceAside).toBeTruthy();
    expect(
      within(serviceAside as HTMLElement).getByRole("link", { name: "Follow up" }),
    ).toHaveAttribute("href", "/el/follow-up");
    const relatedRegion = within(serviceAside as HTMLElement).getByRole("region", {
      name: "Σχετικά θέματα",
    });
    expect(within(relatedRegion).getByRole("navigation")).toBeTruthy();
  });

  it("renders encyclopedia related topics with labelled region and nav", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "encyclopedia-article",
      content: "<h2>Diagnosis</h2><p>Reference body</p>",
      relatedTopics: [{ documentId: "r1", slug: "follow-up", title: "Follow up" }],
    };

    render(<PageBody page={page} />);

    const relatedRegion = screen.getByRole("region", { name: "Σχετικά θέματα" });
    expect(relatedRegion).toHaveAttribute("aria-labelledby", "related-topics-heading");
    expect(within(relatedRegion).getByRole("navigation")).toBeTruthy();
  });

  it("renders related topic thumbnails when featuredImage is set", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "encyclopedia-article",
      content: "<h2>Diagnosis</h2><p>Reference body</p>",
      relatedTopics: [
        {
          documentId: "r1",
          slug: "follow-up",
          title: "Follow up",
          featuredImage: {
            url: "https://cdn.example/follow-up.jpg",
            alternativeText: "Follow up preview",
            width: 400,
            height: 300,
          },
        },
      ],
    };

    render(<PageBody page={page} />);

    const relatedRegion = screen.getByRole("region", { name: "Σχετικά θέματα" });
    expect(within(relatedRegion).getByRole("img", { name: "Follow up preview" })).toBeTruthy();
    const link = within(relatedRegion).getByRole("link");
    expect(link).toHaveAttribute("href", "/el/follow-up");
    expect(link).toHaveTextContent("Follow up");
  });

  it("hides related topics panel when the list is empty", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "encyclopedia-article",
      content: "<h2>Diagnosis</h2><p>Reference body</p>",
      relatedTopics: [],
    };

    render(<PageBody page={page} />);
    expect(screen.queryByRole("region", { name: "Σχετικά θέματα" })).toBeNull();
  });
});

describe("AppointmentPage", () => {
  it("renders without crashing", () => {
    const apptPage: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "appointment-form",
      title: "Appointment",
    };

    render(<AppointmentPage page={apptPage} />);
    expect(screen.getByRole("heading", { name: "Appointment" })).toBeDefined();
  });

  it("renders appointment request form and localized quick contact actions", () => {
    const apptPage: PageDTO = {
      ...BASE_PAGE,
      locale: "el",
      layoutVariant: "appointment-form",
      title: "Ραντεβού",
      excerpt: "Same text as body",
      content: "<p>Same text as body</p>",
    };

    render(<AppointmentPage page={apptPage} settings={MOCK_GLOBAL_SETTINGS} />);

    expect(screen.getByRole("heading", { name: "Ραντεβού" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Αίτημα ραντεβού" })).toBeNull();
    expect(screen.queryByText("appointment")).toBeNull();
    expect(screen.getByLabelText(/ημέρα επίσκεψης/i)).toBeDefined();
    expect(screen.queryByRole("radio", { name: "09:00" })).toBeNull();
    expect(screen.queryByLabelText(/Email/i)).toBeNull();
    expect(screen.getByLabelText(/Μήνυμα/i)).toBeDefined();
    expect(screen.queryByLabelText(/Επισύναψη αρχείου/i)).toBeNull();
    expect(screen.queryByText("Same text as body")).toBeNull();
    expect(screen.getByRole("link", { name: "Κλήση τώρα" })).toHaveAttribute(
      "href",
      "tel:+302110194618",
    );
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:pavlos.tsolaridis@gmail.com",
    );
  });

  it("uses a MODX-style date-time picker with day, hour, then minute steps", () => {
    const apptPage: PageDTO = {
      ...BASE_PAGE,
      locale: "ru",
      layoutVariant: "appointment-form",
      title: "Запись",
    };

    render(<AppointmentPage page={apptPage} />);

    const dateInput = screen.getByLabelText(/день посещения/i);
    expect(dateInput).toHaveAttribute("readonly");
    expect(dateInput).toHaveValue("");
    expect(screen.getByLabelText(/Сообщение/i)).toBeDefined();
    expect(screen.queryByRole("radio", { name: "09:00" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /календар/i }));
    fireEvent.click(screen.getByRole("button", { name: "19" }));

    expect(screen.getByRole("button", { name: "9:00" })).toBeDefined();
    expect(screen.getByRole("button", { name: "13:00" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "10:00" }));

    expect(screen.getByRole("button", { name: "10:00" })).toBeDefined();
    expect(screen.getByRole("button", { name: "10:30" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "10:30" }));

    expect(dateInput).toHaveValue("19/06/2026 10:30");
  });

  it("enables Mon/Fri 09-14 and Tue/Thu 14-20, disables Wed/Sat/Sun", () => {
    const apptPage: PageDTO = {
      ...BASE_PAGE,
      locale: "ru",
      layoutVariant: "appointment-form",
      title: "Запись",
    };

    render(<AppointmentPage page={apptPage} />);

    fireEvent.click(screen.getByRole("button", { name: /календар/i }));

    // June 2026: 4=Thu (enabled 14-20), 6=Sat (disabled), 14=Sun (disabled)
    expect(screen.getByRole("button", { name: "4" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "6" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "14" })).toBeDisabled();

    // 8=Mon (enabled 09-14), 9=Tue (enabled 14-20), 10=Wed (disabled)
    expect(screen.getByRole("button", { name: "8" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "9" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "10" })).toBeDisabled();
  });

  it("renders sections through SectionRenderer", () => {
    const apptPage: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "appointment-form",
      title: "Appointment",
      sections: [
        {
          __component: "sections.faq",
          heading: "Before Your Visit",
          items: [{ question: "What to bring?", answer: "ID and insurance card" }],
        },
      ],
    };

    render(<AppointmentPage page={apptPage} />);
    expect(screen.getByText("What to bring?")).toBeDefined();
  });
});
