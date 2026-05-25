import { describe, expect, it, vi, beforeEach } from "vitest";
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
  process.env.NEXT_PUBLIC_MEILI_HOST = "http://localhost:57700";
  process.env.NEXT_PUBLIC_MEILI_SEARCH_KEY = "test-key";
});

const baseProps = {
  locale: "el" as const,
  placeholder: "Αναζητήστε άρθρα και βίντεο...",
  searchLabel: "Αναζήτηση",
  isOpen: true,
  onClose: vi.fn(),
};

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
    mockSearch.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "ab", { delay: 50 });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalled();
    });
  });

  it("shows no-results message when search returns empty", async () => {
    mockSearch.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "ab", { delay: 50 });

    expect(await screen.findByText(/Δεν βρέθηκαν αποτελέσματα/)).toBeInTheDocument();
  });

  it("groups results into pages and videos", async () => {
    mockSearch.mockResolvedValue({
      hits: [
        {
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
        },
        {
          id: "video:1",
          type: "video",
          locale: "el",
          title: "Test Video",
          excerpt: "Video desc",
          href: "/el/video",
          thumbnail: null,
          parentTitle: null,
          parentSlug: null,
          publishedAt: "",
          parentSection: null,
          parentSectionLabel: null,
          tags: [],
          layoutVariant: "video-index",
          slug: "",
        },
      ],
      estimatedTotalHits: 2,
    });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    expect(await screen.findByText("Άρθρα")).toBeInTheDocument();
    expect(screen.getAllByText("Βίντεο").length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText("Test Page")).toBeInTheDocument();
    expect(await screen.findByText("Test Video")).toBeInTheDocument();
  });

  it('renders "See all" link with correct href', async () => {
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
      estimatedTotalHits: 1,
    });

    render(<SearchOverlay {...baseProps} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test", { delay: 50 });

    const link = await screen.findByText(/Δείτε όλα τα/);
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
});
