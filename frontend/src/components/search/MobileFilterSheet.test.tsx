import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileFilterSheet } from "./MobileFilterSheet";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("q=test"),
  usePathname: () => "/el/search-results",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("MobileFilterSheet", () => {
  it("renders a 'Filters' trigger button", () => {
    render(<MobileFilterSheet sections={["Section A"]} locale="el" activeFilterCount={0} />);
    expect(screen.getByRole("button")).toHaveTextContent(/φίλτρα/i);
  });

  it("shows filter count in the trigger", () => {
    render(<MobileFilterSheet sections={["Section A"]} locale="el" activeFilterCount={2} />);
    expect(screen.getByRole("button")).toHaveTextContent("Φίλτρα (2)");
  });

  it("renders count in Russian locale", () => {
    render(<MobileFilterSheet sections={["Section A"]} locale="ru" activeFilterCount={1} />);
    expect(screen.getByRole("button")).toHaveTextContent("Фильтры (1)");
  });

  it("opens bottom-sheet on trigger click", async () => {
    const user = userEvent.setup();
    render(<MobileFilterSheet sections={["Section A"]} locale="el" activeFilterCount={0} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes bottom-sheet on backdrop click", async () => {
    const user = userEvent.setup();
    render(<MobileFilterSheet sections={["Section A"]} locale="el" activeFilterCount={0} />);
    await user.click(screen.getByRole("button"));
    const backdrop = screen.getByRole("dialog");
    await user.click(backdrop);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not show filter count when 0", () => {
    render(<MobileFilterSheet sections={[]} locale="el" activeFilterCount={0} />);
    expect(screen.getByRole("button")).toHaveTextContent("Φίλτρα");
    expect(screen.getByRole("button")).not.toHaveTextContent("(");
  });
});
