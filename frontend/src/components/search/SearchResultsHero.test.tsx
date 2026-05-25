import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchResultsHero } from "./SearchResultsHero";

const exampleQueries = [
  "ωτορινολαρυγγολόγος",
  "rinoplastiki",
  "ЛОР",
  "septum surgery",
];

describe("SearchResultsHero", () => {
  it("renders search heading in Greek", () => {
    render(<SearchResultsHero locale="el" />);
    expect(screen.getByRole("heading")).toHaveTextContent(/αναζήτηση/i);
  });

  it("renders search heading in Russian", () => {
    render(<SearchResultsHero locale="ru" />);
    expect(screen.getByRole("heading")).toHaveTextContent(/поиск/i);
  });

  it("renders a search form with input and button", () => {
    render(<SearchResultsHero locale="el" />);
    const input = screen.getByRole("searchbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("name", "q");
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("form action points to correct locale path", () => {
    render(<SearchResultsHero locale="ru" />);
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/ru/search-results");
  });

  it("renders 4 example query links", () => {
    render(<SearchResultsHero locale="el" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(exampleQueries.length);
    for (const q of exampleQueries) {
      expect(screen.getByText(q)).toBeInTheDocument();
    }
  });

  it("example query links point to correct locale search URL", () => {
    render(<SearchResultsHero locale="el" />);
    const link = screen.getByText("rinoplastiki");
    expect(link).toHaveAttribute("href", "/el/search-results?q=rinoplastiki");
  });

  it("encodes special characters in example query URLs", () => {
    render(<SearchResultsHero locale="el" />);
    const link = screen.getByText("ωτορινολαρυγγολόγος");
    expect(link).toHaveAttribute("href", "/el/search-results?q=%CF%89%CF%84%CE%BF%CF%81%CE%B9%CE%BD%CE%BF%CE%BB%CE%B1%CF%81%CF%85%CE%B3%CE%B3%CE%BF%CE%BB%CF%8C%CE%B3%CE%BF%CF%82");
  });
});
