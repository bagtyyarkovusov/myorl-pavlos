import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PageRenderer } from "./PageRenderer";
import type { PageDTO, NavigationNodeDTO, GlobalSettingsDTO, VideoEntryDTO } from "@/lib/cms/types";

const mockVideoEntries: VideoEntryDTO[] = [
  {
    documentId: "video-1",
    locale: "el",
    title: "Sample video",
    youtubeId: "abc123",
    youtubeUrl: "https://www.youtube.com/watch?v=abc123",
    categories: [],
    sortOrder: 1,
    relatedArticle: null,
    legacyArticleUrl: null,
  },
];

vi.mock("@/lib/cms/video-entries", () => ({
  fetchVideoEntries: vi.fn(async () => mockVideoEntries),
}));

vi.mock("@/components/page-layouts/VideoDirectoryPage", async () => {
  const actual = await vi.importActual<typeof import("./page-layouts/VideoDirectoryPage")>(
    "@/components/page-layouts/VideoDirectoryPage",
  );
  return {
    ...actual,
    VideoDirectoryPage: ({
      page,
      navigation = [],
    }: {
      page: PageDTO;
      navigation?: NavigationNodeDTO[];
    }) => (
      <actual.VideoDirectoryPageWithEntries
        page={page}
        navigation={navigation}
        entries={mockVideoEntries}
      />
    ),
  };
});

beforeEach(() => {
  vi.stubEnv("STRAPI_URL", "http://localhost:1337");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://myorl.example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

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

describe("PageRenderer", () => {
  it("renders StandardPage for default content page", async () => {
    render(<PageRenderer page={BASE_PAGE} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Test Page" })).toBeDefined();
    });
  });

  it("renders HomePage for home page type", async () => {
    const homePage: PageDTO = {
      ...BASE_PAGE,
      pageType: "home",
      layoutVariant: "home",
      title: "Home",
    };
    render(<PageRenderer page={homePage} globalSettings={MOCK_GLOBAL_SETTINGS} />);
    await waitFor(() => {
      expect(document.querySelector("[data-locale='el']")).toBeDefined();
    });
  });

  it("renders FrontendNativePage for frontend-native render mode", async () => {
    const nativePage: PageDTO = { ...BASE_PAGE, renderMode: "frontend-native", title: "Native" };
    render(<PageRenderer page={nativePage} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Native" })).toBeDefined();
    });
  });

  it("renders AppointmentPage for appointment-form layout", async () => {
    const apptPage: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "appointment-form",
      title: "Appointment",
    };
    render(<PageRenderer page={apptPage} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Appointment" })).toBeDefined();
    });
  });

  it("renders SectionIndexPage for section-index layout", async () => {
    const indexPage: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "section-index",
      title: "Index",
      isFolder: true,
    };
    render(<PageRenderer page={indexPage} navigation={[]} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Index" })).toBeDefined();
    });
  });

  it("renders VideoDirectoryPage for video-index layout", async () => {
    const videoPage: PageDTO = {
      ...BASE_PAGE,
      layoutVariant: "video-index",
      title: "Videos",
      slug: "video",
      isFolder: true,
    };

    render(<PageRenderer page={videoPage} navigation={[]} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Videos" })).toBeDefined();
      expect(screen.getByRole("heading", { name: "Sample video" })).toBeDefined();
    });
    expect(screen.queryByRole("link", { name: /Child page/ })).toBeNull();
  });

  it("renders SectionIndexPage for directory layout variants", async () => {
    const variants: Array<PageDTO["layoutVariant"]> = [
      "section-index",
      "clinic-index",
      "encyclopedia-index",
    ];

    for (const variant of variants) {
      const directoryPage: PageDTO = {
        ...BASE_PAGE,
        documentId: `nav-${variant}`,
        layoutVariant: variant,
        title: variant,
        slug: variant,
        isFolder: true,
      };
      const navigation: NavigationNodeDTO[] = [
        {
          ...makeNavNode(variant, variant),
          documentId: `nav-${variant}`,
          children: [
            {
              ...makeNavNode(`${variant}-child`, "Child page"),
              tags: variant === "encyclopedia-index" ? [{ name: "Ρινός", slug: "nose" }] : [],
              layoutVariant: variant === "encyclopedia-index" ? "encyclopedia-article" : "standard",
            },
          ],
        },
      ];

      const { unmount } = render(<PageRenderer page={directoryPage} navigation={navigation} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: variant })).toBeDefined();
        expect(screen.getByRole("link", { name: /Child page/ })).toBeDefined();
      });

      unmount();
    }
  });

  it("uses tagged directory navigation pages for the encyclopedia index", async () => {
    const directoryPage: PageDTO = {
      ...BASE_PAGE,
      documentId: "nav-orl-egkyklopaidia",
      layoutVariant: "encyclopedia-index",
      title: "ΩΡΛ Εγκυκλοπαίδεια",
      slug: "orl-egkyklopaidia",
      isFolder: true,
    };
    const taggedServiceArticle = {
      ...makeNavNode("xeno-soma-igmoreio", "Ξένο σώμα στο ιγμόρειο άντρο"),
      hideFromMenu: true,
      layoutVariant: "service-article" as const,
      tags: [
        { name: "Ενδοσκοπική χειρουργική", slug: "endoscopic-surgery" },
        { name: "Ρινός", slug: "nose" },
      ],
    };
    const untaggedArticle = {
      ...makeNavNode("plain-page", "Plain page"),
      layoutVariant: "service-article" as const,
    };
    const taggedFolder = {
      ...makeNavNode("rinoplastiki", "Σύγχρονη λειτουργική ρινοπλαστική"),
      isFolder: true,
      layoutVariant: "section-hub" as const,
      tags: [{ name: "Ρινός", slug: "nose" }],
    };
    const directoryNavigation: NavigationNodeDTO[] = [
      {
        ...makeNavNode("orl-egkyklopaidia", "ΩΡΛ Εγκυκλοπαίδεια"),
        documentId: "nav-orl-egkyklopaidia",
        children: [],
      },
      {
        ...makeNavNode("pathiseis", "Παθήσεις"),
        documentId: "nav-pathiseis",
        children: [taggedServiceArticle, untaggedArticle, taggedFolder],
      },
    ];

    render(
      <PageRenderer
        page={directoryPage}
        navigation={[]}
        directoryNavigation={directoryNavigation}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Ξένο σώμα/ })).toHaveAttribute(
        "href",
        "/el/xeno-soma-igmoreio",
      );
      expect(screen.queryByRole("link", { name: /Plain page/ })).toBeNull();
      expect(screen.queryByRole("link", { name: /Σύγχρονη λειτουργική/ })).toBeNull();
    });
  });

  it("renders QuestionListPage for faq page type", async () => {
    const faqPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "faq",
      layoutVariant: "service-faq",
      title: "FAQ",
    };
    render(<PageRenderer page={faqPage} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "FAQ" })).toBeDefined();
    });
  });

  it("renders QuestionListPage for accordion page type", async () => {
    const accordionPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "accordion",
      layoutVariant: "standard",
      title: "Accordion",
    };
    render(<PageRenderer page={accordionPage} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Accordion" })).toBeDefined();
    });
  });

  it("renders QuestionListPage for tabs page type", async () => {
    const tabsPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "tabs",
      layoutVariant: "standard",
      title: "Tabs",
    };
    render(<PageRenderer page={tabsPage} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Tabs" })).toBeDefined();
    });
  });

  it("renders GalleryPage for gallery page type", async () => {
    const galleryPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "gallery",
      layoutVariant: "clinic-gallery",
      title: "Gallery",
    };
    render(<PageRenderer page={galleryPage} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Gallery" })).toBeDefined();
    });
  });

  it("renders ContactPage for contact page type", async () => {
    const contactPage: PageDTO = {
      ...BASE_PAGE,
      pageType: "contact",
      layoutVariant: "contact",
      title: "Contact",
    };
    render(<PageRenderer page={contactPage} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Contact" })).toBeDefined();
    });
  });

  it("injects WebSite and WebPage JSON-LD on every page", async () => {
    render(<PageRenderer page={BASE_PAGE} />);
    await waitFor(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      const contents = Array.from(scripts).map((s) => s.textContent ?? "");
      const hasWebSite = contents.some((c) => c.includes('"@type":"WebSite"'));
      const hasWebPage = contents.some((c) => c.includes('"@type":"WebPage"'));
      expect(hasWebSite).toBe(true);
      expect(hasWebPage).toBe(true);
    });
  });
});

function makeNavNode(slug: string, navLabel: string, menuIndex = 0): NavigationNodeDTO {
  return {
    documentId: `nav-${slug}`,
    locale: "el",
    slug,
    title: navLabel,
    menuTitle: null,
    navLabel,
    menuIndex,
    hideFromMenu: false,
    parentPage: null,
    externalUrl: null,
    isFolder: false,
    layoutVariant: "standard",
    excerpt: null,
    featuredImage: null,
    imageCenter: null,
    tags: [],
    href: `/el/${slug}`,
    children: [],
  };
}
