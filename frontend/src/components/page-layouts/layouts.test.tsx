import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { fetchVideoEntries } from "@/lib/cms/video-entries";

vi.mock("@/lib/cms/video-entries", () => ({
  fetchVideoEntries: vi.fn(async () => []),
}));

import { HomePage } from "./HomePage";
import { StandardPage } from "./StandardPage";
import { SectionIndexPage } from "./SectionIndexPage";
import { SectionHubPage } from "./SectionHubPage";
import { PageBody, extractHeadings, addHeadingIds, relatedTopicHref } from "./PageBody";
import { AppointmentPage } from "./AppointmentPage";
import { ContactPage } from "./ContactPage";
import { GalleryPage } from "./GalleryPage";
import { QuestionListPage } from "./QuestionListPage";
import { FrontendNativePage } from "./FrontendNativePage";
import type { NavigationNodeDTO, PageDTO, GlobalSettingsDTO } from "@/lib/cms/types";

beforeEach(() => {
  vi.stubEnv("STRAPI_URL", "http://localhost:1337");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://myorl.example.com");
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

  it("expands a clinic panel on click without changing the map iframe src", () => {
    const { container } = render(<ContactPage page={CONTACT_PAGE} />);
    const map = container.querySelector("iframe[data-contact-map]");
    expect(map).toBeTruthy();
    const initialSrc = map!.getAttribute("src");

    const athensToggle = screen.getByRole("button", { name: /Athens/ });
    fireEvent.click(athensToggle);
    expect(athensToggle).toHaveAttribute("aria-expanded", "true");

    const thessToggle = screen.getByRole("button", { name: /Thessaloniki/ });
    fireEvent.click(thessToggle);

    expect(map!.getAttribute("src")).toBe(initialSrc);
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
    const map = container.querySelector("iframe[data-contact-map]");
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
    expect(container.querySelector("iframe[data-contact-map]")).toBeNull();
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
          items: [{ caption: "Photo 1", image: null }],
        },
      ],
    };

    render(<GalleryPage page={galleryPage} />);
    expect(screen.getByText("Photo 1")).toBeDefined();
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
            { caption: "Photo A", image: null },
            { caption: "Photo B", image: null },
          ],
        },
      ],
    };

    render(<GalleryPage page={galleryPage} />);
    expect(screen.getByText("Photo A")).toBeDefined();
    expect(screen.getByText("Photo B")).toBeDefined();
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
    expect(screen.getByLabelText(/Προτιμώμενη ημέρα/i)).toBeDefined();
    expect(
      screen.getByLabelText(/Λόγος επίσκεψης και προτιμώμενη ώρα \(προαιρετικά\)/i),
    ).toBeDefined();
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
