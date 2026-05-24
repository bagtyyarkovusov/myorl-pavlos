import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { CmsHtml } from "./CmsHtml";

describe("CmsHtml", () => {
  it("renders sanitized rich text with the public prose wrapper classes", () => {
    render(<CmsHtml html="<p>Clinical copy</p>" />);

    const prose = screen.getByText("Clinical copy").closest("div");
    expect(prose?.className).toContain("cms-html");
    expect(prose?.className).toContain("prose-luxury");
  });

  it("merges caller classes without dropping the public prose wrapper", () => {
    render(<CmsHtml html="<p>Clinical copy</p>" className="custom-prose" />);

    const prose = screen.getByText("Clinical copy").closest("div");
    expect(prose?.className).toContain("cms-html");
    expect(prose?.className).toContain("prose-luxury");
    expect(prose?.className).toContain("custom-prose");
  });

  it("adds a variant data attribute for variant-scoped prose styling", () => {
    render(<CmsHtml html="<blockquote>Clinical note</blockquote>" variant="service" />);

    const prose = screen.getByText("Clinical note").closest("div");
    expect(prose?.getAttribute("data-variant")).toBe("service");
    expect(prose?.className).toContain("prose-service");
  });

  it("adds public classes for encyclopedia and specialized prose variants", () => {
    render(<CmsHtml html="<p>Clinical copy</p>" variant="encyclopedia" />);
    expect(screen.getByText("Clinical copy").closest("div")?.className).toContain(
      "prose-encyclopedia",
    );

    render(<CmsHtml html="<p>Research copy</p>" variant="specialized" />);
    expect(screen.getByText("Research copy").closest("div")?.className).toContain(
      "prose-specialized",
    );
  });

  it("preserves editor callout classes while stripping unrelated classes", () => {
    render(
      <CmsHtml html='<div class="callout-teal unsafe-class">Clinical note</div><p class="unsafe-class">Body</p>' />,
    );

    expect(screen.getByText("Clinical note").closest("div")?.className).toBe("callout-teal");
    expect(screen.getByText("Body").className).toBe("");
  });

  it("renders nothing for empty sanitized content", () => {
    const { container } = render(<CmsHtml html="<script>alert(1)</script>" />);

    expect(container.firstChild).toBeNull();
  });

  it("outputs youtube hydration placeholders for cms embeds", () => {
    render(
      <CmsHtml html='<iframe src="https://www.youtube.com/embed/testid"></iframe>' locale="ru" />,
    );

    expect(document.querySelector("[data-cms-youtube]")).toBeTruthy();
    expect(document.querySelector("iframe")).toBeNull();
  });
});
