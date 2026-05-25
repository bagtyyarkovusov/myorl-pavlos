import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchOverlay } from "./SearchOverlay";

const mockSearch = vi.fn();

vi.mock("meilisearch", () => {
  function MeilisearchMock() {
    return {
      index: function () {
        return { search: mockSearch };
      },
    };
  }
  return { Meilisearch: MeilisearchMock };
});

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: Record<string, unknown>) => (
    <img src={src as string} alt={(alt as string) ?? ""} {...props} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSearch.mockReset();
  process.env.NEXT_PUBLIC_SEARCH_ENABLED = "true";
  process.env.NEXT_PUBLIC_MEILI_HOST = "http://localhost:57700";
  process.env.NEXT_PUBLIC_MEILI_SEARCH_KEY = "test-key";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SEARCH_ENABLED;
  delete process.env.NEXT_PUBLIC_MEILI_HOST;
  delete process.env.NEXT_PUBLIC_MEILI_SEARCH_KEY;
});

const baseProps = {
  locale: "el" as const,
  placeholder: "Αναζητήστε άρθρα και βίντεο...",
  searchLabel: "Αναζήτηση",
  isOpen: true,
  onClose: vi.fn(),
};

function makeHit(overrides: Record<string, unknown> = {}) {
  return {
    id: "page:1",
    type: "page",
    locale: "el",
    title: "Test Page",
    excerpt: "Description",
    href: "/el/test",
    thumbnail: null,
    parentTitle: null,
    parentSlug: null,
    publishedAt: "",
    parentSection: null,
    parentSectionLabel: null,
    tags: [],
    layoutVariant: "default",
    slug: "test",
    ...overrides,
  };
}

describe("SearchOverlay", () => {
  it("renders null when closed", () => {
    const { container } = render(<SearchOverlay {...baseProps} isOpen={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows placeholder text when query is < 2 chars", () => {
    render(<SearchOverlay {...baseProps} />);
    expect(screen.getByText("Πληκτρολογήστε τουλάχιστον 2 χαρακτήρες...")).toBeInTheDocument();
  });

  it("does not fire search for short queries", async () => {
    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "a");
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("fires search when query has 2+ chars", async () => {
    mockSearch.mockResolvedValue({
      hits: [],
      estimatedTotalHits: 0,
      facetDistribution: { type: { page: 0, video: 0 } },
    });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "ab", { delay: 50 });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalled();
    });
  });

  it("shows no-results message when search returns empty", async () => {
    mockSearch.mockResolvedValue({
      hits: [],
      estimatedTotalHits: 0,
      facetDistribution: { type: { page: 0, video: 0 } },
    });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "ab", { delay: 50 });

    expect(await screen.findByText(/Δεν βρέθηκαν αποτελέσματα/)).toBeInTheDocument();
  });

  it("groups results into pages and videos", async () => {
    mockSearch.mockResolvedValue({
      hits: [
        makeHit({ id: "page:1", type: "page", title: "Test Page" }),
        makeHit({ id: "video:1", type: "video", title: "Test Video", layoutVariant: "video-index", slug: "" }),
      ],
      estimatedTotalHits: 2,
      facetDistribution: { type: { page: 1, video: 1 } },
    });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    expect(await screen.findByText("Άρθρα")).toBeInTheDocument();
    expect(screen.getAllByText("Βίντεο").length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText("Test Page")).toBeInTheDocument();
    expect(await screen.findByText("Test Video")).toBeInTheDocument();
  });

  it("caps at 3 results per group", async () => {
    const hits = [
      makeHit({ id: "page:1", type: "page", title: "Page 1" }),
      makeHit({ id: "page:2", type: "page", title: "Page 2" }),
      makeHit({ id: "page:3", type: "page", title: "Page 3" }),
      makeHit({ id: "page:4", type: "page", title: "Page 4" }),
      makeHit({ id: "page:5", type: "page", title: "Page 5" }),
    ];
    mockSearch.mockResolvedValue({
      hits,
      estimatedTotalHits: 5,
      facetDistribution: { type: { page: 5, video: 0 } },
    });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    await waitFor(() => {
      expect(screen.getByText("Page 1")).toBeInTheDocument();
    });
    expect(screen.getByText("Page 2")).toBeInTheDocument();
    expect(screen.getByText("Page 3")).toBeInTheDocument();
    expect(screen.queryByText("Page 4")).not.toBeInTheDocument();
    expect(screen.queryByText("Page 5")).not.toBeInTheDocument();
  });

  it("shows per-group see-all link when facet count exceeds cap", async () => {
    const hits = [
      makeHit({ id: "page:1", type: "page", title: "Page 1" }),
      makeHit({ id: "page:2", type: "page", title: "Page 2" }),
      makeHit({ id: "page:3", type: "page", title: "Page 3" }),
    ];
    mockSearch.mockResolvedValue({
      hits,
      estimatedTotalHits: 8,
      facetDistribution: { type: { page: 8, video: 0 } },
    });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    const groupSeeAll = await screen.findByText(/Δείτε όλα τα 8 αποτελέσματα στα Άρθρα/);
    expect(groupSeeAll).toBeInTheDocument();
    expect(groupSeeAll).toHaveAttribute("href", "/el/search-results?q=test&type=page");
  });

  it("does not show per-group see-all when count equals cap", async () => {
    const hits = [
      makeHit({ id: "page:1", type: "page", title: "Page 1" }),
    ];
    mockSearch.mockResolvedValue({
      hits,
      estimatedTotalHits: 1,
      facetDistribution: { type: { page: 1, video: 0 } },
    });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    await waitFor(() => {
      expect(screen.getByText("Page 1")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Δείτε όλα τα.*αποτελέσματα στα/)).not.toBeInTheDocument();
  });

  it('renders sticky footer "See all" link with query in text', async () => {
    mockSearch.mockResolvedValue({
      hits: [makeHit()],
      estimatedTotalHits: 1,
      facetDistribution: { type: { page: 1, video: 0 } },
    });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    const link = await screen.findByText(/Δείτε όλα τα.*αποτελέσματα για "test"/);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/el\/search-results\?q=test&sid=[0-9a-f-]{36}$/),
    );
  });

  it("shows error message when search fails", async () => {
    mockSearch.mockRejectedValue(new Error("Network error"));

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    expect(await screen.findByText(/Σφάλμα αναζήτησης/)).toBeInTheDocument();
  });

  it("calls onClose on Escape key", async () => {
    const onClose = vi.fn();
    render(<SearchOverlay {...baseProps} onClose={onClose} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has a close X button", async () => {
    const onClose = vi.fn();
    render(<SearchOverlay {...baseProps} onClose={onClose} />);

    const closeBtn = screen.getByRole("button", { name: "Κλείσιμο" });
    expect(closeBtn).toBeInTheDocument();
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows fallback locale banner and pills when current locale has 0 results", async () => {
    // First call (el) returns 0 hits
    mockSearch
      .mockResolvedValueOnce({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: { type: { page: 0, video: 0 } },
      })
      // Second call (ru) returns results
      .mockResolvedValueOnce({
        hits: [
          makeHit({ id: "page:ru1", type: "page", title: "Русская статья", locale: "ru", href: "/ru/test" }),
        ],
        estimatedTotalHits: 1,
        facetDistribution: { type: { page: 1, video: 0 } },
      });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    expect(await screen.findByText(/Δεν βρέθηκαν αποτελέσματα στα ελληνικά/)).toBeInTheDocument();
    // Locale pill should appear on fallback results
    expect(await screen.findByText("[ru]")).toBeInTheDocument();
  });

  it("suppresses thumbnails for article results", async () => {
    mockSearch.mockResolvedValue({
      hits: [
        makeHit({
          id: "page:1",
          type: "page",
          title: "Article With Thumb",
          thumbnail: "/uploads/thumb.jpg",
        }),
      ],
      estimatedTotalHits: 1,
      facetDistribution: { type: { page: 1, video: 0 } },
    });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    await waitFor(() => {
      expect(screen.getByText("Article With Thumb")).toBeInTheDocument();
    });
    // Article should not have an <img> (thumbnail suppressed)
    const article = screen.getByText("Article With Thumb").closest("article");
    expect(article).toBeInTheDocument();
    expect(article!.querySelector("img")).toBeNull();
  });

  it("renders type filter pills (All, Articles, Videos)", async () => {
    mockSearch.mockResolvedValue({
      hits: [
        makeHit({ id: "page:1", type: "page", title: "Page 1" }),
        makeHit({ id: "video:1", type: "video", title: "Video 1", layoutVariant: "video-index", slug: "" }),
      ],
      estimatedTotalHits: 2,
      facetDistribution: { type: { page: 1, video: 1 } },
    });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    await waitFor(() => {
      expect(screen.getByText("Page 1")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Όλα" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Άρθρα" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Βίντεο" })).toBeInTheDocument();
  });

  it("filters results when type pill is clicked", async () => {
    mockSearch.mockResolvedValue({
      hits: [
        makeHit({ id: "page:1", type: "page", title: "Page 1" }),
        makeHit({ id: "video:1", type: "video", title: "Video 1", layoutVariant: "video-index", slug: "" }),
      ],
      estimatedTotalHits: 2,
      facetDistribution: { type: { page: 1, video: 1 } },
    });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    await waitFor(() => {
      expect(screen.getByText("Page 1")).toBeInTheDocument();
    });

    const articlesPill = screen.getByRole("button", { name: "Άρθρα" });
    await userEvent.click(articlesPill);

    // Only article should remain visible
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(screen.queryByText("Video 1")).not.toBeInTheDocument();
  });

  it("logs search queries to /api/search/log", async () => {
    mockSearch.mockResolvedValue({
      hits: [
        {
          id: "page:1",
          type: "page",
          locale: "el",
          title: "Test",
          excerpt: "",
          href: "/el/test",
          thumbnail: null,
          parentTitle: null,
          parentSlug: null,
          publishedAt: "",
          parentSection: null,
          parentSectionLabel: null,
          tags: [],
          layoutVariant: "default",
          slug: "test",
        },
      ],
      estimatedTotalHits: 3,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/search/log",
        expect.objectContaining({
          method: "POST",
          headers: { "content-type": "application/json" },
        }),
      );
    });

    const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
    expect(body.query).toBe("test");
    expect(body.locale).toBe("el");
    expect(body.result_count).toBe(3);
    expect(body.session_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    fetchSpy.mockRestore();
  });

  it("logs queries with zero result_count when search returns empty", async () => {
    mockSearch.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "xy", { delay: 50 });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
    expect(body.result_count).toBe(0);

    fetchSpy.mockRestore();
  });

  it("returns null when NEXT_PUBLIC_SEARCH_ENABLED is false", () => {
    process.env.NEXT_PUBLIC_SEARCH_ENABLED = "false";
    const { container } = render(<SearchOverlay {...baseProps} isOpen={true} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders a close button that calls onClose when clicked", async () => {
    const onClose = vi.fn();
    render(<SearchOverlay {...baseProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText("Κλείσιμο");
    expect(closeButton).toBeInTheDocument();
    await userEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
