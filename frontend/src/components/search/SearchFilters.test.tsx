import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchFilters } from "./SearchFilters";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("q=test"),
  usePathname: () => "/el/search-results",
  useRouter: () => ({ push: mockReplace }),
}));

const sampleSections = ["Ωτορινολαρυγγολογία", "Πλαστική Χειρουργική"];

describe("SearchFilters", () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it("renders type filter with three options", () => {
    render(<SearchFilters sections={sampleSections} locale="el" />);
    expect(screen.getByText("Όλα")).toBeInTheDocument();
    expect(screen.getByText("Άρθρα")).toBeInTheDocument();
    expect(screen.getByText("Βίντεο")).toBeInTheDocument();
  });

  it("renders sort filter with two options", () => {
    render(<SearchFilters sections={sampleSections} locale="el" />);
    expect(screen.getByText("Συνάφεια")).toBeInTheDocument();
    expect(screen.getByText("Νεότερα")).toBeInTheDocument();
  });

  it("renders section filter when sections provided", () => {
    render(<SearchFilters sections={sampleSections} locale="el" />);
    expect(screen.getByText("Όλες οι ενότητες")).toBeInTheDocument();
    expect(screen.getByText("Ωτορινολαρυγγολογία")).toBeInTheDocument();
    expect(screen.getByText("Πλαστική Χειρουργική")).toBeInTheDocument();
  });

  it("renders no sections when sections array empty", () => {
    render(<SearchFilters sections={[]} locale="el" />);
    expect(screen.getByText("Όλες οι ενότητες")).toBeInTheDocument();
    // Only the "All sections" button — no section-specific buttons
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent("Όλες οι ενότητες");
  });

  it("navigates when type filter clicked", async () => {
    const user = userEvent.setup();
    render(<SearchFilters sections={sampleSections} locale="el" />);
    await user.click(screen.getByText("Άρθρα"));
    expect(mockReplace).toHaveBeenCalledWith("/el/search-results?q=test&type=page&page=1");
  });

  it("navigates when sort changed", async () => {
    const user = userEvent.setup();
    render(<SearchFilters sections={sampleSections} locale="el" />);
    await user.click(screen.getByText("Νεότερα"));
    expect(mockReplace).toHaveBeenCalledWith("/el/search-results?q=test&sort=newest&page=1");
  });

  it("uses Russian labels for ru locale", () => {
    render(<SearchFilters sections={sampleSections} locale="ru" />);
    expect(screen.getByText("Все")).toBeInTheDocument();
    expect(screen.getByText("Статьи")).toBeInTheDocument();
    expect(screen.getByText("Видео")).toBeInTheDocument();
    expect(screen.getByText("Все разделы")).toBeInTheDocument();
    expect(screen.getByText("Релевантность")).toBeInTheDocument();
    expect(screen.getByText("Новые")).toBeInTheDocument();
  });

  it("resets page to 1 when section filter changes", async () => {
    const user = userEvent.setup();
    render(<SearchFilters sections={sampleSections} locale="el" />);
    await user.click(screen.getByText("Ωτορινολαρυγγολογία"));
    expect(mockReplace).toHaveBeenCalledWith(
      "/el/search-results?q=test&sectionLabel=%CE%A9%CF%84%CE%BF%CF%81%CE%B9%CE%BD%CE%BF%CE%BB%CE%B1%CF%81%CF%85%CE%B3%CE%B3%CE%BF%CE%BB%CE%BF%CE%B3%CE%AF%CE%B1&page=1",
    );
  });
});
