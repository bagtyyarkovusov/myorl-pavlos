import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./Pagination";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("q=test&type=page"),
  usePathname: () => "/el/search-results",
  useRouter: () => ({ push: mockReplace }),
}));

describe("Pagination", () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

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

  it("disables prev button on page 1", () => {
    render(<Pagination currentPage={1} totalPages={5} prevLabel="Prev" nextLabel="Next" />);
    expect(screen.getByText("Prev")).toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(<Pagination currentPage={5} totalPages={5} prevLabel="Prev" nextLabel="Next" />);
    expect(screen.getByText("Prev")).not.toBeDisabled();
    expect(screen.getByText("Next")).toBeDisabled();
  });

  it("sets aria-current on active page", () => {
    render(<Pagination currentPage={3} totalPages={5} prevLabel="Prev" nextLabel="Next" />);
    const activeBtn = screen.getByText("3");
    expect(activeBtn).toHaveAttribute("aria-current", "page");
  });

  it("shows ellipsis for large page counts", () => {
    render(<Pagination currentPage={5} totalPages={20} prevLabel="Prev" nextLabel="Next" />);
    const ellipses = screen.getAllByText("...");
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });

  it("navigates when page number clicked", async () => {
    const user = userEvent.setup();
    render(<Pagination currentPage={1} totalPages={5} prevLabel="Prev" nextLabel="Next" />);
    await user.click(screen.getByText("3"));
    expect(mockReplace).toHaveBeenCalledWith("/el/search-results?q=test&type=page&page=3");
  });

  it("removes page param when going to page 1", async () => {
    const user = userEvent.setup();
    render(<Pagination currentPage={2} totalPages={5} prevLabel="Prev" nextLabel="Next" />);
    await user.click(screen.getByText("1"));
    expect(mockReplace).toHaveBeenCalledWith("/el/search-results?q=test&type=page");
  });

  it("uses custom prev/next labels", () => {
    render(
      <Pagination currentPage={2} totalPages={5} prevLabel="Προηγούμενο" nextLabel="Επόμενο" />,
    );
    expect(screen.getByText("Προηγούμενο")).toBeInTheDocument();
    expect(screen.getByText("Επόμενο")).toBeInTheDocument();
  });
});
