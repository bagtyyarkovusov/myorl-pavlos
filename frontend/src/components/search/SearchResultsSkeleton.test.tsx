import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchResultsSkeleton } from "./SearchResultsSkeleton";

describe("SearchResultsSkeleton", () => {
  it("renders 4 skeleton rows", () => {
    const { container } = render(<SearchResultsSkeleton />);
    const rows = container.querySelectorAll('[role="status"]');
    expect(rows).toHaveLength(4);
  });

  it("applies aria-busy and aria-label to the container", () => {
    render(<SearchResultsSkeleton />);
    const container = screen.getByLabelText(/loading/i);
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("aria-busy", "true");
  });
});
