import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchResultsError } from "./SearchResultsError";

describe("SearchResultsError", () => {
  describe('type="unavailable"', () => {
    it("renders unavailable message in Greek", () => {
      render(<SearchResultsError type="unavailable" locale="el" />);
      expect(screen.getByText(/προσωρινά μη διαθέσιμη/i)).toBeInTheDocument();
    });

    it("renders unavailable message in Russian", () => {
      render(<SearchResultsError type="unavailable" locale="ru" />);
      expect(screen.getByText(/поиск временно недоступен/i)).toBeInTheDocument();
    });

    it("renders a link to the Articles section index", () => {
      render(<SearchResultsError type="unavailable" locale="el" />);
      const articlesLink = screen.getByText(/άρθρα/i);
      expect(articlesLink.tagName).toBe("A");
      expect(articlesLink).toHaveAttribute("href", "/el");
    });

    it("renders a link to the Videos section index", () => {
      render(<SearchResultsError type="unavailable" locale="ru" />);
      const videosLink = screen.getByText(/видео/i);
      expect(videosLink.tagName).toBe("A");
      expect(videosLink).toHaveAttribute("href", "/ru/video");
    });
  });

  describe('type="network"', () => {
    it("renders network error message in Greek", () => {
      render(<SearchResultsError type="network" locale="el" />);
      expect(screen.getByText(/δεν ήταν δυνατή η σύνδεση/i)).toBeInTheDocument();
    });

    it("renders network error message in Russian", () => {
      render(<SearchResultsError type="network" locale="ru" />);
      expect(screen.getByText(/не удалось подключиться/i)).toBeInTheDocument();
    });

    it("renders a Retry link that points back to the same page", () => {
      render(<SearchResultsError type="network" locale="el" retryPath="/el/search-results?q=test" />);
      const retry = screen.getByRole("link", { name: /επανάληψη/i });
      expect(retry).toHaveAttribute("href", "/el/search-results?q=test");
    });
  });
});
