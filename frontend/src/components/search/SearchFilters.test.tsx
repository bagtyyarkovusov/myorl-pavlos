import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchFilters } from "./SearchFilters";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("q=test"),
  usePathname: () => "/el/search-results",
  useRouter: () => ({ push: vi.fn() }),
}));

const sampleSections = ["Ωτορινολαρυγγολογία", "Πλαστική Χειρουργική"];

describe("SearchFilters", () => {
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
    expect(screen.queryByText("Ωτορινολαρυγγολογία")).not.toBeInTheDocument();
    expect(screen.queryByText("Πλαστική Χειρουργική")).not.toBeInTheDocument();
  });

  it("renders <a> links with correct href for type filter", () => {
    render(<SearchFilters sections={sampleSections} locale="el" />);
    const articlesLink = screen.getByText("Άρθρα");
    expect(articlesLink.tagName).toBe("A");
    expect(articlesLink).toHaveAttribute("href", "/el/search-results?q=test&type=page&page=1");
  });

  it("renders <a> links with correct href for sort filter", () => {
    render(<SearchFilters sections={sampleSections} locale="el" />);
    const newestLink = screen.getByText("Νεότερα");
    expect(newestLink.tagName).toBe("A");
    expect(newestLink).toHaveAttribute("href", "/el/search-results?q=test&sort=newest&page=1");
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

  it("resets page to 1 when section filter changes", () => {
    render(<SearchFilters sections={sampleSections} locale="el" />);
    const sectionLink = screen.getByText("Ωτορινολαρυγγολογία");
    expect(sectionLink.tagName).toBe("A");
    expect(sectionLink).toHaveAttribute(
      "href",
      "/el/search-results?q=test&sectionLabel=%CE%A9%CF%84%CE%BF%CF%81%CE%B9%CE%BD%CE%BF%CE%BB%CE%B1%CF%81%CF%85%CE%B3%CE%B3%CE%BF%CE%BB%CE%BF%CE%B3%CE%AF%CE%B1&page=1",
    );
  });
});
