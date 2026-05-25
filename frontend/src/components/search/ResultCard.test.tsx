import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultCard } from "./ResultCard";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: Record<string, unknown>) => (
    <img src={src as string} alt={(alt as string) ?? ""} {...props} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const baseProps = {
  href: "/el/rinoplastiki",
  excerpt: "Clinical description",
  type: "page" as const,
  thumbnail: null,
  parentTitle: null,
  parentSlug: null,
  locale: "el" as const,
};

describe("ResultCard", () => {
  it("renders title with highlighted <em> tags", () => {
    const { container } = render(
      <ResultCard {...baseProps} title="Ρινοπλαστική <em>επεμβαση</em>" />,
    );
    const link = container.querySelector("a");
    expect(link?.innerHTML).toContain("<em>επεμβαση</em>");
  });

  it("renders breadcrumb when parentTitle + parentSlug present", () => {
    render(
      <ResultCard
        {...baseProps}
        title="Test"
        parentTitle="Χειρουργική"
        parentSlug="cheirourgiki"
      />,
    );
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Χειρουργική" });
    expect(link).toHaveAttribute("href", "/el/cheirourgiki");
  });

  it("omits breadcrumb when parentTitle is null", () => {
    render(<ResultCard {...baseProps} title="Test" />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("renders Article chip for type=page and Video chip for type=video", () => {
    const { unmount } = render(<ResultCard {...baseProps} title="Page" type="page" />);
    expect(screen.getByText("Άρθρο")).toBeInTheDocument();
    unmount();

    render(<ResultCard {...baseProps} title="Video" type="video" locale="ru" />);
    expect(screen.getByText("Видео")).toBeInTheDocument();
  });

  it("renders thumbnail Image when present", () => {
    const { container } = render(
      <ResultCard {...baseProps} title="Test" thumbnail="/uploads/test.jpg" />,
    );
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/uploads/test.jpg");
  });

  it("omits thumbnail when null", () => {
    const { container } = render(<ResultCard {...baseProps} title="Test" thumbnail={null} />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("renders locale pill when localePill is set", () => {
    render(<ResultCard {...baseProps} title="Test" localePill="ru" />);
    expect(screen.getByText("[ru]")).toBeInTheDocument();
  });

  it("omits locale pill when localePill is undefined", () => {
    render(<ResultCard {...baseProps} title="Test" />);
    expect(screen.queryByText("[el]")).not.toBeInTheDocument();
    expect(screen.queryByText("[ru]")).not.toBeInTheDocument();
  });
});
