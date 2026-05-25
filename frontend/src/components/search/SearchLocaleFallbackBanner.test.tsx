import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchLocaleFallbackBanner } from "./SearchLocaleFallbackBanner";

describe("SearchLocaleFallbackBanner", () => {
  it("renders Greek banner with result count", () => {
    render(<SearchLocaleFallbackBanner locale="el" resultCount={12} />);
    expect(screen.getByRole("status")).toHaveTextContent("12 αποτελέσματα");
  });

  it("renders Russian banner with result count", () => {
    render(<SearchLocaleFallbackBanner locale="ru" resultCount={7} />);
    expect(screen.getByRole("status")).toHaveTextContent("7 результатов");
  });

  it("renders allLangs label when allLangs=true", () => {
    const { unmount } = render(<SearchLocaleFallbackBanner locale="el" allLangs />);
    expect(screen.getByRole("status")).toHaveTextContent("Όλες οι γλώσσες");
    unmount();

    render(<SearchLocaleFallbackBanner locale="ru" allLangs />);
    expect(screen.getByRole("status")).toHaveTextContent("Все языки");
  });
});
