import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockQuery = vi.fn();

vi.mock("@/lib/db", () => ({
  query: mockQuery,
  logSearchQuery: vi.fn(),
}));

const topQueryRows = [
  { query: "ρινοπλαστική", locale: "el", count: "42" },
  { query: "βλεφαροπλαστική", locale: "el", count: "28" },
  { query: "ринопластика", locale: "ru", count: "15" },
  { query: "ωτοπλαστική", locale: "el", count: "12" },
];

const zeroResultRows = [
  { query: "βλαστοκύτταρα", locale: "el", count: "8" },
  { query: "ботокс", locale: "ru", count: "5" },
  { query: "implants", locale: "el", count: "3" },
];

describe("/admin/search-analytics page", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function renderPage(locale?: string): Promise<void> {
    const searchParams = locale ? { locale } : {};
    const { default: Page } = await import("./page");
    const element = await Page({ searchParams: Promise.resolve(searchParams) });
    render(element);
  }

  it("renders top queries table with query, locale, and count columns", async () => {
    mockQuery.mockResolvedValueOnce({ rows: topQueryRows, rowCount: 4 });
    mockQuery.mockResolvedValueOnce({ rows: zeroResultRows, rowCount: 3 });

    await renderPage();

    expect(screen.getByText("ρινοπλαστική")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("ринопластика")).toBeTruthy();
    // "el" appears in both tabs and table cells
    expect(screen.getAllByText("el").length).toBeGreaterThanOrEqual(2);
  });

  it("renders zero-result queries table", async () => {
    mockQuery.mockResolvedValueOnce({ rows: topQueryRows, rowCount: 4 });
    mockQuery.mockResolvedValueOnce({ rows: zeroResultRows, rowCount: 3 });

    await renderPage();

    expect(screen.getByText("βλαστοκύτταρα")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("ботокс")).toBeTruthy();
  });

  it("filters by locale when locale searchParam is set", async () => {
    const elTopRows = topQueryRows.filter((r) => r.locale === "el");
    const elZeroRows = zeroResultRows.filter((r) => r.locale === "el");
    mockQuery.mockResolvedValueOnce({ rows: elTopRows, rowCount: 2 });
    mockQuery.mockResolvedValueOnce({ rows: elZeroRows, rowCount: 1 });

    await renderPage("el");

    expect(screen.getByText("ρινοπλαστική")).toBeTruthy();
    expect(screen.queryByText("ринопластика")).toBeNull();
    expect(screen.queryByText("ботокс")).toBeNull();
  });

  it("shows locale filter tabs", async () => {
    mockQuery.mockResolvedValueOnce({ rows: topQueryRows, rowCount: 4 });
    mockQuery.mockResolvedValueOnce({ rows: zeroResultRows, rowCount: 3 });

    await renderPage();

    // "All" should be a tab link
    expect(screen.getByRole("link", { name: "All" })).toBeTruthy();
    // "el" and "ru" appear both in tabs and data, so check links exist
    expect(screen.getByRole("link", { name: "el" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ru" })).toBeTruthy();
  });

  it("highlights the active locale tab", async () => {
    mockQuery.mockResolvedValueOnce({ rows: topQueryRows, rowCount: 4 });
    mockQuery.mockResolvedValueOnce({ rows: zeroResultRows, rowCount: 3 });

    await renderPage("el");
    const elLinks = screen.getAllByText("el");
    // The active tab link should have an aria-current attribute
    const activeTab = elLinks.find(
      (el) => el.closest("a")?.getAttribute("aria-current") === "page",
    );
    expect(activeTab).toBeTruthy();
  });

  it("shows empty state when there is no data", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await renderPage();

    expect(
      screen.getByText(/no search query data yet/i),
    ).toBeTruthy();
  });

  it("shows empty state for zero-result queries specifically", async () => {
    mockQuery.mockResolvedValueOnce({ rows: topQueryRows, rowCount: 4 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await renderPage();

    expect(screen.getByText("ρινοπλαστική")).toBeTruthy();
    expect(
      screen.getByText(/no zero-result queries/i),
    ).toBeTruthy();
  });

  it("passes the correct SQL parameters for 30-day window", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await renderPage();

    const calls = mockQuery.mock.calls;
    // Both queries should include a date filter
    for (const call of calls) {
      const sql: string = call[0];
      expect(sql).toContain("created_at");
      expect(sql).toContain("30");
    }
  });

  it("adds locale param when locale filter is active", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await renderPage("el");

    const calls = mockQuery.mock.calls;
    for (const call of calls) {
      expect(call[1]).toEqual(["el"]);
    }
  });
});
