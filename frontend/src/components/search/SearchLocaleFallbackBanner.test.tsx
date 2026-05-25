import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchLocaleFallbackBanner } from "./SearchLocaleFallbackBanner";

describe("SearchLocaleFallbackBanner", () => {
  it("renders Greek banner when locale=el", () => {
    render(<SearchLocaleFallbackBanner locale="el" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Δεν βρέθηκαν αποτελέσματα στα ελληνικά — εμφανίζονται αποτελέσματα στα ρωσικά",
    );
  });

  it("renders Russian banner when locale=ru", () => {
    render(<SearchLocaleFallbackBanner locale="ru" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Результаты на русском не найдены — показаны результаты на греческом",
    );
  });

  it("renders allLangs label when allLangs=true", () => {
    const { unmount } = render(<SearchLocaleFallbackBanner locale="el" allLangs />);
    expect(screen.getByRole("status")).toHaveTextContent("Όλες οι γλώσσες");
    unmount();

    render(<SearchLocaleFallbackBanner locale="ru" allLangs />);
    expect(screen.getByRole("status")).toHaveTextContent("Все языки");
  });
});
