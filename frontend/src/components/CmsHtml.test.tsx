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

  it("renders nothing for empty sanitized content", () => {
    const { container } = render(<CmsHtml html="<script>alert(1)</script>" />);

    expect(container.firstChild).toBeNull();
  });
});
