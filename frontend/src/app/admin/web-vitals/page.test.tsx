import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockQuery = vi.fn();

vi.mock("@/lib/db", () => ({
  query: mockQuery,
  logSearchQuery: vi.fn(),
  logWebVital: vi.fn(),
}));

const lcpPathRows = [
  { path: "/el", device_type: "desktop", p75: "2450.3", sample_count: "142" },
  { path: "/el/rinoplastiki", device_type: "mobile", p75: "3200.1", sample_count: "89" },
  { path: "/ru", device_type: "desktop", p75: "2100.7", sample_count: "67" },
];

const clsPathRows = [
  { path: "/el", device_type: "desktop", p75: "0.08", sample_count: "142" },
  { path: "/el/rinoplastiki", device_type: "mobile", p75: "0.12", sample_count: "89" },
];

const inpPathRows = [
  { path: "/el", device_type: "desktop", p75: "120.0", sample_count: "50" },
  { path: "/el/rinoplastiki", device_type: "mobile", p75: "200.0", sample_count: "32" },
];

const lcpDailyRows = [
  { day: "2026-05-26", p75: "2500.0", sample_count: "30" },
  { day: "2026-05-25", p75: "2400.0", sample_count: "28" },
];

const clsDailyRows = [{ day: "2026-05-26", p75: "0.09", sample_count: "30" }];

const inpDailyRows = [{ day: "2026-05-26", p75: "130.0", sample_count: "15" }];

const emptyRows: Record<string, never>[] = [];

/**
 * The page makes 6 queries: path-LCP, path-CLS, path-INP, daily-LCP, daily-CLS, daily-INP.
 * Pass 6 mock result tuples as [pathLCP, pathCLS, pathINP, dailyLCP, dailyCLS, dailyINP].
 */
function setupMocks(results: Array<{ rows: unknown[]; rowCount: number }>) {
  for (const r of results) {
    mockQuery.mockResolvedValueOnce(r);
  }
}

describe("/admin/web-vitals page", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function renderPage(params?: { locale?: string; device_type?: string }): Promise<void> {
    const searchParams = params ? { ...params } : {};
    const { default: Page } = await import("./page");
    const element = await Page({ searchParams: Promise.resolve(searchParams) });
    render(element);
  }

  it("renders p75 tables for LCP, CLS, and INP by path", async () => {
    setupMocks([
      { rows: lcpPathRows, rowCount: 3 },
      { rows: clsPathRows, rowCount: 2 },
      { rows: inpPathRows, rowCount: 2 },
      { rows: emptyRows, rowCount: 0 },
      { rows: emptyRows, rowCount: 0 },
      { rows: emptyRows, rowCount: 0 },
    ]);

    await renderPage();

    expect(screen.getByText("p75 LCP by Path (Last 30 Days)")).toBeTruthy();
    expect(screen.getByText("p75 CLS by Path (Last 30 Days)")).toBeTruthy();
    expect(screen.getByText("p75 INP by Path (Last 30 Days)")).toBeTruthy();
  });

  it("renders p75 tables by day", async () => {
    setupMocks([
      { rows: emptyRows, rowCount: 0 },
      { rows: emptyRows, rowCount: 0 },
      { rows: emptyRows, rowCount: 0 },
      { rows: lcpDailyRows, rowCount: 2 },
      { rows: clsDailyRows, rowCount: 1 },
      { rows: inpDailyRows, rowCount: 1 },
    ]);

    await renderPage();

    expect(screen.getByText("p75 LCP by Day (Last 30 Days)")).toBeTruthy();
    expect(screen.getByText("p75 CLS by Day (Last 30 Days)")).toBeTruthy();
    expect(screen.getByText("p75 INP by Day (Last 30 Days)")).toBeTruthy();
    // "2026-05-26" appears in all three daily tables
    expect(screen.getAllByText("2026-05-26").length).toBe(3);
    expect(screen.getByText("2500.0")).toBeTruthy();
  });

  it("renders path and p75 values in tables", async () => {
    setupMocks([
      { rows: lcpPathRows, rowCount: 3 },
      { rows: clsPathRows, rowCount: 2 },
      { rows: inpPathRows, rowCount: 2 },
      { rows: emptyRows, rowCount: 0 },
      { rows: emptyRows, rowCount: 0 },
      { rows: emptyRows, rowCount: 0 },
    ]);

    await renderPage();

    const elEntries = screen.getAllByText("/el");
    expect(elEntries.length).toBe(3); // one per metric table
    const rinoplastikiEntries = screen.getAllByText("/el/rinoplastiki");
    expect(rinoplastikiEntries.length).toBe(3);

    expect(screen.getByText("2450.3")).toBeTruthy();
    expect(screen.getByText("120.0")).toBeTruthy();
    expect(screen.getAllByText("142").length).toBe(2);
    expect(screen.getByText("0.08")).toBeTruthy();
  });

  it("shows device type column", async () => {
    setupMocks([
      { rows: lcpPathRows, rowCount: 3 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage();

    expect(screen.getAllByText("desktop").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("mobile")).toBeTruthy();
  });

  it("shows locale filter tabs", async () => {
    setupMocks([
      { rows: lcpPathRows, rowCount: 3 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage();

    const allLinks = screen.getAllByRole("link", { name: "All" });
    expect(allLinks.length).toBe(2);

    const elLink = screen.getByRole("link", { name: "el" });
    expect(elLink.getAttribute("href")).toBe("/admin/web-vitals?locale=el");
    const ruLink = screen.getByRole("link", { name: "ru" });
    expect(ruLink.getAttribute("href")).toBe("/admin/web-vitals?locale=ru");
  });

  it("shows device type filter tabs", async () => {
    setupMocks([
      { rows: lcpPathRows, rowCount: 3 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage();

    expect(screen.getByRole("link", { name: "Desktop" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mobile" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tablet" })).toBeTruthy();
  });

  it("filters by locale when searchParam is set", async () => {
    setupMocks([
      { rows: [lcpPathRows[0]], rowCount: 1 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage({ locale: "el" });

    const calls = mockQuery.mock.calls;
    for (const call of calls) {
      const sql: string = call[0];
      expect(sql).toContain("locale");
    }
  });

  it("filters by device_type when searchParam is set", async () => {
    setupMocks([
      { rows: [lcpPathRows[0]], rowCount: 1 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage({ device_type: "desktop" });

    const calls = mockQuery.mock.calls;
    for (const call of calls) {
      const sql: string = call[0];
      expect(sql).toContain("device_type");
    }
  });

  it("filters by both locale and device_type", async () => {
    setupMocks([
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage({ locale: "el", device_type: "desktop" });

    const calls = mockQuery.mock.calls;
    for (const call of calls) {
      expect(call[1]).toEqual(["el", "desktop"]);
    }
  });

  it("shows empty state when all queries return no data", async () => {
    setupMocks([
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage();

    expect(screen.getByText(/no web vitals data yet/i)).toBeTruthy();
  });

  it("shows no-data message for a specific metric", async () => {
    setupMocks([
      { rows: lcpPathRows, rowCount: 3 },
      { rows: [], rowCount: 0 },
      { rows: inpPathRows, rowCount: 2 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage();

    expect(screen.getByText("p75 LCP by Path (Last 30 Days)")).toBeTruthy();
    expect(screen.getByText(/no cls data/i)).toBeTruthy();
    expect(screen.getByText("p75 INP by Path (Last 30 Days)")).toBeTruthy();
  });

  it("queries within 30-day window", async () => {
    setupMocks([
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage();

    const calls = mockQuery.mock.calls;
    for (const call of calls) {
      const sql: string = call[0];
      expect(sql).toContain("created_at");
      expect(sql).toContain("30");
    }
  });

  it("uses percentile_cont for p75 calculations", async () => {
    setupMocks([
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage();

    const calls = mockQuery.mock.calls;
    for (const call of calls) {
      const sql: string = call[0];
      expect(sql).toContain("percentile_cont(0.75)");
    }
  });

  it("highlights the active locale tab", async () => {
    setupMocks([
      { rows: lcpPathRows, rowCount: 3 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage({ locale: "el" });

    const elLinks = screen.getAllByText("el");
    const activeTab = elLinks.find(
      (el) => el.closest("a")?.getAttribute("aria-current") === "page",
    );
    expect(activeTab).toBeTruthy();
  });

  it("makes six queries — three path + three daily per metric", async () => {
    setupMocks([
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage();

    expect(mockQuery).toHaveBeenCalledTimes(6);
  });

  it("daily tables group by DATE(created_at)", async () => {
    setupMocks([
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
    ]);

    await renderPage();

    const dailyCalls = mockQuery.mock.calls.slice(3); // last 3 are daily queries
    for (const call of dailyCalls) {
      const sql: string = call[0];
      expect(sql).toContain("DATE(created_at)");
      expect(sql).toContain("GROUP BY DATE(created_at)");
    }
  });
});
