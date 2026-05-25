import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination } from "./Pagination";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("q=test&type=page"),
  usePathname: () => "/el/search-results",
}));

describe("Pagination", () => {
  it("returns null when totalPages <= 1", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} prevLabel="Prev" nextLabel="Next" />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders prev, page numbers, and next", () => {
    render(<Pagination currentPage={1} totalPages={5} prevLabel="Prev" nextLabel="Next" />);
    expect(screen.getByText("Prev")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("renders prev as <span> on first page", () => {
    render(<Pagination currentPage={1} totalPages={5} prevLabel="Prev" nextLabel="Next" />);
    const prev = screen.getByText("Prev");
    expect(prev.tagName).toBe("SPAN");
    expect(prev).toHaveAttribute("aria-hidden", "true");
  });

  it("renders next as <span> on last page", () => {
    render(<Pagination currentPage={5} totalPages={5} prevLabel="Prev" nextLabel="Next" />);
    const next = screen.getByText("Next");
    expect(next.tagName).toBe("SPAN");
    expect(next).toHaveAttribute("aria-hidden", "true");
  });

  it("renders prev as link when not on first page", () => {
    render(<Pagination currentPage={3} totalPages={5} prevLabel="Prev" nextLabel="Next" />);
    expect(screen.getByText("Prev").tagName).toBe("A");
  });

  it("sets aria-current on active page", () => {
    render(<Pagination currentPage={3} totalPages={5} prevLabel="Prev" nextLabel="Next" />);
    const activeLink = screen.getByText("3");
    expect(activeLink.tagName).toBe("A");
    expect(activeLink).toHaveAttribute("aria-current", "page");
  });

  it("shows ellipsis for large page counts", () => {
    render(<Pagination currentPage={5} totalPages={20} prevLabel="Prev" nextLabel="Next" />);
    const ellipses = screen.getAllByText("...");
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });

  it("renders <a> links with correct href for page numbers", () => {
    render(<Pagination currentPage={1} totalPages={5} prevLabel="Prev" nextLabel="Next" />);
    const page3 = screen.getByText("3");
    expect(page3.tagName).toBe("A");
    expect(page3).toHaveAttribute("href", "/el/search-results?q=test&type=page&page=3");
  });

  it("removes page param in href when page is 1", () => {
    render(<Pagination currentPage={2} totalPages={5} prevLabel="Prev" nextLabel="Next" />);
    const page1Link = screen.getByText("1");
    expect(page1Link.tagName).toBe("A");
    expect(page1Link).toHaveAttribute("href", "/el/search-results?q=test&type=page");
  });

  it("uses custom prev/next labels", () => {
    render(
      <Pagination currentPage={2} totalPages={5} prevLabel="Προηγούμενο" nextLabel="Επόμενο" />,
    );
    expect(screen.getByText("Προηγούμενο")).toBeInTheDocument();
    expect(screen.getByText("Επόμενο")).toBeInTheDocument();
  });
});
