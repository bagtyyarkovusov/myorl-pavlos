import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { HomePage } from "./HomePage";
import { StandardPage } from "./StandardPage";
import { SectionIndexPage } from "./SectionIndexPage";
import { AppointmentPage } from "./AppointmentPage";
import { ContactPage } from "./ContactPage";
import { GalleryPage } from "./GalleryPage";
import { QuestionListPage } from "./QuestionListPage";
import { FrontendNativePage } from "./FrontendNativePage";
import type { NavigationNodeDTO, PageDTO, GlobalSettingsDTO } from "@/lib/cms/types";

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
      <StandardPage page={{ ...BASE_PAGE, title: "Service", layoutVariant: "service-article" }} />,
    );
    expect(screen.getByText("service article")).toBeDefined();
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
      <StandardPage
        page={{ ...BASE_PAGE, title: "Parent", isFolder: true }}
        navigation={nav}
      />,
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

    expect(screen.getByRole("main")).toBeDefined();
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

    expect(screen.getByRole("main").getAttribute("data-locale")).toBe("el");
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

    expect(screen.getByRole("link", { name: /Services/ })).toHaveAttribute(
      "href",
      "/el/yperesies",
    );
    expect(screen.getByRole("link", { name: /Video/ })).toHaveAttribute("href", "/el/video");
  });
});

describe("ContactPage", () => {
  it("renders contact from sections array", () => {
    const contactPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "contact",
      layoutVariant: "contact",
      title: "Contact Us",
      sections: [
        {
          __component: "sections.contact" as const,
          heading: "Get in Touch",
          intro: null,
          details: [{ type: "phone", valueHtml: "<p>+30 210 123 4567</p>" }],
          clinics: [{ name: "Athens", addressHtml: "<p>123 Main St</p>", phone: null, email: null }],
        },
      ],
    };

    render(<ContactPage page={contactPage} />);
    expect(screen.getByText("+30 210 123 4567")).toBeDefined();
  });

  it("renders contact details in a featured band", () => {
    const contactPage: PageDTO = {
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
          clinics: [{ name: "Athens", addressHtml: "<p>123 Main St</p>", phone: null, email: null }],
        },
      ],
    };

    const { container } = render(<ContactPage page={contactPage} />);
    const band = container.querySelector("[data-contact-band]");
    expect(band).toBeTruthy();
  });

  it("renders clinics in a separate grid section", () => {
    const contactPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "contact",
      layoutVariant: "contact",
      title: "Contact Us",
      sections: [
        {
          __component: "sections.contact" as const,
          heading: "Get in Touch",
          intro: null,
          details: [{ type: "phone", valueHtml: "<p>+30 210 123 4567</p>" }],
          clinics: [
            { name: "Athens", addressHtml: "<p>123 Main St</p>", phone: "+30 210 000", email: null },
            { name: "Thessaloniki", addressHtml: "<p>456 Other St</p>", phone: null, email: "th@cl.com" },
          ],
        },
      ],
    };

    render(<ContactPage page={contactPage} />);
    expect(screen.getByText("Athens")).toBeDefined();
    expect(screen.getByText("Thessaloniki")).toBeDefined();
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
            { caption: "Photo 1", image: { url: "/img/1.jpg", alternativeText: "Pic 1", width: 800, height: 600 } },
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
        children: [
          makeNav("rhinitis", "Rhinitis", 1),
          makeNav("sinusitis", "Sinusitis", 2),
        ],
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
        children: [
          makeNav("rhinitis", "Rhinitis", 1),
          makeNav("sinusitis", "Sinusitis", 2),
        ],
      },
    ];

    render(<SectionIndexPage page={page} navigation={nav} />);

    expect(screen.getByRole("link", { name: /Rhinitis/ })).toHaveAttribute("href", "/el/rhinitis");
    expect(screen.getByRole("link", { name: /Sinusitis/ })).toHaveAttribute("href", "/el/sinusitis");
  });

  it("renders nothing for child grid when no navigation match", () => {
    const page: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "section-index",
      isFolder: true,
      title: "Orphan",
    };

    const { container } = render(<SectionIndexPage page={page} navigation={[]} />);

    expect(container.querySelector("ol")).toBeNull();
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
