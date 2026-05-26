import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockGetPageResult = vi.fn();

vi.mock("@/lib/cms/cms-api", () => ({
  getPageResult: mockGetPageResult,
}));

function makePage(locale: string, slug: string, title = "Test Page") {
  return {
    ok: true as const,
    page: {
      documentId: "doc-123",
      locale,
      slug,
      title,
      navLabel: title,
      pageType: "content" as const,
      layoutVariant: "standard" as const,
      renderMode: "cms" as const,
      seo: {
        metaTitle: null,
        metaDescription: null,
        canonicalUrl: null,
        robotsNoindex: false,
        robotsNofollow: false,
        sitemapExclude: false,
        sitemapPriority: null,
        sitemapChangeFrequency: null,
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
      },
      seoTitle: title,
      isFolder: false,
      hideFromMenu: false,
      menuIndex: 0,
      relatedPages: [],
      relatedTopics: [],
      tags: [],
      alternateUrls: {},
      sections: [],
    },
  };
}

function makeNotFound(locale: string, slug: string) {
  return {
    ok: false as const,
    error: {
      kind: "not_found" as const,
      locale,
      slug,
      message: `Page not found: ${locale}/${slug}`,
    },
  };
}

describe("LocaleSlugNotFound", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetPageResult.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function renderNotFound(locale: string, slug: string): Promise<void> {
    const { default: Component } = await import("./not-found");
    const element = await Component({
      params: Promise.resolve({ locale, slug }),
    });
    render(element);
  }

  describe("cross-locale 404", () => {
    it("renders link to EL page when browsing RU and page exists only in Greek", async () => {
      // Page NOT found in RU, but EXISTS in EL
      mockGetPageResult.mockResolvedValueOnce(makePage("el", "test-page", "Δοκιμαστική Σελίδα"));

      await renderNotFound("ru", "test-page");

      // Should render the 404 heading in Russian
      expect(screen.getByText("Страница не найдена")).toBeTruthy();

      // Should show the cross-locale message
      expect(screen.getByText(/недоступна на русском/i)).toBeTruthy();

      // Should have a link to the Greek page
      const link = screen.getByText("Ελληνικά");
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", "/el/test-page");
    });

    it("renders link to RU page when browsing EL and page exists only in Russian", async () => {
      // Page NOT found in EL, but EXISTS in RU
      mockGetPageResult.mockResolvedValueOnce(makePage("ru", "test-page", "Тестовая Страница"));

      await renderNotFound("el", "test-page");

      // Should render the 404 heading in Greek
      expect(screen.getByText("Η σελίδα δεν βρέθηκε")).toBeTruthy();

      // Should show the cross-locale message
      expect(screen.getByText(/δεν είναι διαθέσιμη στα Ελληνικά/i)).toBeTruthy();

      // Should have a link to the Russian page
      const link = screen.getByText("Русский");
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", "/ru/test-page");
    });

    it("includes a search form on cross-locale 404 page", async () => {
      mockGetPageResult.mockResolvedValueOnce(makePage("el", "test-page", "Page"));

      await renderNotFound("ru", "test-page");

      const searchForm = screen.getByRole("search");
      expect(searchForm).toBeTruthy();
      expect(searchForm).toHaveAttribute("action", "/ru/search-results");
      expect(searchForm).toHaveAttribute("method", "get");

      const searchInput = searchForm.querySelector('input[name="q"]');
      expect(searchInput).toBeTruthy();
      expect((searchInput as HTMLInputElement).type).toBe("search");
    });

    it("includes noindex meta tag on cross-locale 404 page", async () => {
      mockGetPageResult.mockResolvedValueOnce(makePage("el", "test-page", "Page"));

      await renderNotFound("ru", "test-page");

      const metaRobots = document.querySelector('meta[name="robots"]');
      expect(metaRobots).toBeTruthy();
      expect(metaRobots).toHaveAttribute("content", "noindex");
    });

    it("preserves the other locale's actual slug in the link", async () => {
      // The other locale might have a different slug
      mockGetPageResult.mockResolvedValueOnce(makePage("el", "diaforetiko-slug", "Different"));

      await renderNotFound("ru", "original-slug");

      const link = screen.getByText("Ελληνικά");
      expect(link).toHaveAttribute("href", "/el/diaforetiko-slug");
    });
  });

  describe("pure 404", () => {
    it("renders pure 404 when page exists in neither locale (EL request)", async () => {
      // Page NOT found in EL, and NOT in RU either
      mockGetPageResult.mockResolvedValueOnce(makeNotFound("ru", "missing-page"));

      await renderNotFound("el", "missing-page");

      expect(screen.getByText("Η σελίδα δεν βρέθηκε")).toBeTruthy();
      expect(screen.getByText(/δεν υπάρχει/i)).toBeTruthy();

      // Should NOT have a cross-locale link
      expect(screen.queryByText("Ελληνικά")).toBeNull();
      expect(screen.queryByText("Русский")).toBeNull();

      // Should have a search form
      expect(screen.getByRole("search")).toBeTruthy();
    });

    it("renders pure 404 when page exists in neither locale (RU request)", async () => {
      mockGetPageResult.mockResolvedValueOnce(makeNotFound("el", "missing-page"));

      await renderNotFound("ru", "missing-page");

      expect(screen.getByText("Страница не найдена")).toBeTruthy();
      expect(screen.getByText(/не существует/i)).toBeTruthy();

      // Should NOT have a cross-locale link
      expect(screen.queryByText("Ελληνικά")).toBeNull();
      expect(screen.queryByText("Русский")).toBeNull();
    });

    it("renders pure 404 when getPageResult returns a network error", async () => {
      // Simulate a network error when checking the other locale
      mockGetPageResult.mockResolvedValueOnce({
        ok: false as const,
        error: {
          kind: "network" as const,
          message: "Connection refused",
        },
      });

      await renderNotFound("el", "broken-slug");

      expect(screen.getByText("Η σελίδα δεν βρέθηκε")).toBeTruthy();
      expect(screen.getByText(/δεν υπάρχει/i)).toBeTruthy();
    });

    it("includes a home link on pure 404 page", async () => {
      mockGetPageResult.mockResolvedValueOnce(makeNotFound("el", "missing-page"));

      await renderNotFound("ru", "missing-page");

      const homeLink = screen.getByText("Главная");
      expect(homeLink.tagName).toBe("A");
      expect(homeLink).toHaveAttribute("href", "/ru");
    });

    it("includes noindex meta tag on pure 404 page", async () => {
      mockGetPageResult.mockResolvedValueOnce(makeNotFound("el", "missing-page"));

      await renderNotFound("el", "missing-page");

      const metaRobots = document.querySelector('meta[name="robots"]');
      expect(metaRobots).toBeTruthy();
      expect(metaRobots).toHaveAttribute("content", "noindex");
    });
  });

  describe("invalid locale", () => {
    it("renders pure 404 for invalid locale code", async () => {
      await renderNotFound("fr", "some-slug");

      expect(screen.getByText("Η σελίδα δεν βρέθηκε")).toBeTruthy();
      expect(screen.getByText(/δεν υπάρχει/i)).toBeTruthy();
    });

    it("does not call getPageResult for invalid locale", async () => {
      await renderNotFound("fr", "some-slug");

      expect(mockGetPageResult).not.toHaveBeenCalled();
    });
  });
});
