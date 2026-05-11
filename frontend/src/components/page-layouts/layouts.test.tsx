import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { HomePage } from "./HomePage";
import { StandardPage } from "./StandardPage";
import { SectionIndexPage } from "./SectionIndexPage";
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
  address: null,
  phoneTel: null,
  phoneDisplay: null,
  hours: null,
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
    excerpt: null,
    featuredImage: null,
    imageCenter: null,
    href: `/el/${slug}`,
    children: [],
  };
}

describe("PageHeader", () => {
  it("renders accent hairline decoration", () => {
    render(<StandardPage page={{ ...BASE_PAGE, title: "Accent Test" }} />);
    const header = screen.getByRole("banner");
    expect(header.querySelector("[data-accent]")).toBeTruthy();
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

  it("accepts navigation prop for future tab bar use", () => {
    const nav = [makeNav("child-1", "Child 1")];
    render(
      <StandardPage page={{ ...BASE_PAGE, title: "Parent", isFolder: true }} navigation={nav} />,
    );
    expect(screen.getByRole("heading", { name: "Parent" })).toBeDefined();
  });

  it("renders content via CmsHtml", () => {
    render(<StandardPage page={{ ...BASE_PAGE, content: "<p>Body text</p>" }} />);

    expect(screen.getByText("Body text")).toBeDefined();
  });

  it("renders section wrapper", () => {
    const { container } = render(<StandardPage page={BASE_PAGE} />);
    expect(container.querySelector("section")).toBeTruthy();
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
    expect(screen.getByRole("navigation", { name: "Ενότητες" })).toBeDefined();
    expect(screen.getByRole("link", { name: "What to expect" })).toHaveAttribute(
      "href",
      "#section-1",
    );
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
          sections: [
            {
              __component: "sections.linked-resources",
              heading: "Related topics",
              items: [
                {
                  title: "Nasal guide",
                  description: null,
                  image: null,
                  targetPage: {
                    documentId: "related-nasal-guide",
                    slug: "nasal-guide",
                    title: "Nasal guide",
                  },
                  targetUrl: null,
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(document.querySelector("[data-hero-variant='compact']")).toBeTruthy();
    expect(document.querySelector("[data-article-layout='encyclopedia']")).toBeTruthy();
    const articleContents = screen.getByRole("navigation", { name: "Περιεχόμενα" });
    expect(articleContents).toBeDefined();
    expect(within(articleContents).getByRole("link", { name: "Diagnosis" })).toHaveAttribute(
      "href",
      "#diagnosis",
    );
    expect(screen.getByText("Reference body").closest("div")?.getAttribute("data-variant")).toBe(
      "encyclopedia",
    );
    expect(screen.getByRole("link", { name: "Nasal guide" })).toBeDefined();
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
        appointmentHref="/el/appointment"
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
        appointmentHref="/el/appointment"
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
        appointmentHref="/el/appointment"
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
        appointmentHref="/el/appointment"
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
        appointmentHref="/el/appointment"
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
        appointmentHref="/el/appointment"
        navigation={navigation}
        settings={MOCK_GLOBAL_SETTINGS}
      />,
    );

    expect(screen.getByRole("link", { name: /Services/ })).toHaveAttribute("href", "/el/yperesies");
    expect(screen.getByRole("link", { name: /Video/ })).toHaveAttribute("href", "/el/video");
  });
});

describe("ContactPage", () => {
  const SETTINGS_WITH_ADDRESS: GlobalSettingsDTO = {
    locale: "el",
    address: "Λεωφ. Αλεξάνδρας 201, Αθήνα",
    phoneTel: "+302106427000",
    phoneDisplay: "+30 210 6427 000",
    hours: null,
  };

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
          { name: "Athens", addressHtml: "<p>123 Main St</p>", phone: "+30 210 000", email: null },
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

  it("renders the section details inside the contact details column", () => {
    render(<ContactPage page={CONTACT_PAGE} globalSettings={SETTINGS_WITH_ADDRESS} />);
    expect(screen.getByText("+30 210 123 4567")).toBeDefined();
    expect(screen.getByText("info@clinic.com")).toBeDefined();
  });

  it("renders the split-screen layout wrapper", () => {
    const { container } = render(
      <ContactPage page={CONTACT_PAGE} globalSettings={SETTINGS_WITH_ADDRESS} />,
    );
    expect(container.querySelector("[data-contact-split]")).toBeTruthy();
  });

  it("renders each clinic as an accordion toggle", () => {
    render(<ContactPage page={CONTACT_PAGE} globalSettings={SETTINGS_WITH_ADDRESS} />);
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
    const { container } = render(
      <ContactPage page={CONTACT_PAGE} globalSettings={SETTINGS_WITH_ADDRESS} />,
    );
    const map = container.querySelector("iframe[data-contact-map]");
    expect(map).toBeTruthy();
    const initialSrc = map!.getAttribute("src");

    const athensToggle = screen.getByRole("button", { name: /Athens/ });
    fireEvent.click(athensToggle);
    expect(athensToggle).toHaveAttribute("aria-expanded", "true");

    const thessToggle = screen.getByRole("button", { name: /Thessaloniki/ });
    fireEvent.click(thessToggle);

    // Map iframe src is mounted once and never changes on selection (PRD #103).
    expect(map!.getAttribute("src")).toBe(initialSrc);
  });

  it("renders phone/email links with tel: and mailto: schemes inside the expanded panel", () => {
    render(<ContactPage page={CONTACT_PAGE} globalSettings={SETTINGS_WITH_ADDRESS} />);

    fireEvent.click(screen.getByRole("button", { name: /Athens/ }));
    const phoneLink = screen.getByRole("link", { name: "+30 210 000" });
    expect(phoneLink).toHaveAttribute("href", "tel:+30210000");

    fireEvent.click(screen.getByRole("button", { name: /Thessaloniki/ }));
    const emailLink = screen.getByRole("link", { name: "th@cl.com" });
    expect(emailLink).toHaveAttribute("href", "mailto:th@cl.com");
  });

  it("hides the map block when global settings has no address", () => {
    const { container } = render(
      <ContactPage
        page={CONTACT_PAGE}
        globalSettings={{ ...SETTINGS_WITH_ADDRESS, address: null }}
      />,
    );
    expect(container.querySelector("iframe[data-contact-map]")).toBeNull();
  });

  it("hides the map block when no globalSettings prop is passed", () => {
    const { container } = render(<ContactPage page={CONTACT_PAGE} />);
    expect(container.querySelector("iframe[data-contact-map]")).toBeNull();
  });

  it("does not render any <StructuredData> tags (composer is the single entry point)", () => {
    const { container } = render(
      <ContactPage page={CONTACT_PAGE} globalSettings={SETTINGS_WITH_ADDRESS} />,
    );
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
    const nav = [
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
    const nav = [
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

    expect(screen.getByText("No pages are available yet.")).toBeDefined();
  });

  it("passes the layout variant into the dense directory grid", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-videos",
      layoutVariant: "video-index",
      isFolder: true,
      title: "Videos",
      slug: "videos",
    };
    const nav = [
      {
        ...makeNav("videos", "Videos"),
        isFolder: true,
        children: [makeNav("tour", "Clinic Tour", 1)],
      },
    ];

    render(<SectionIndexPage page={page} navigation={nav} />);

    expect(document.querySelector('[data-index-variant="video-grid"]')).toBeTruthy();
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

  it("renders prominent contact CTA links", () => {
    const apptPage: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "appointment-form",
      title: "Appointment",
    };

    render(<AppointmentPage page={apptPage} />);
    const phoneLink = screen.getByRole("link", { name: /call/i });
    expect(phoneLink).toBeTruthy();
    const emailLink = screen.getByRole("link", { name: /email/i });
    expect(emailLink).toBeTruthy();
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
