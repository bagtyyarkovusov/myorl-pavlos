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

  it("renders nothing for empty sanitized content", () => {
    const { container } = render(<CmsHtml html="<script>alert(1)</script>" />);

    expect(container.firstChild).toBeNull();
  });
});
