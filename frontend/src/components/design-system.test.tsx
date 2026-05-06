import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ButtonLink, isExternalHref, MediaFrame } from "./design-system";

describe("ButtonLink", () => {
  it("renders internal links with the primary variant by default", () => {
    render(<ButtonLink href="/el/rantevou">Book</ButtonLink>);

    const link = screen.getByRole("link", { name: "Book" });
    expect(link.getAttribute("href")).toBe("/el/rantevou");
    expect(link.className).toContain("bg-ink");
    expect(link.className).toContain("text-bone-50");
  });

  it("renders external links with safe external attributes", () => {
    render(<ButtonLink href="https://example.com">External</ButtonLink>);

    const link = screen.getByRole("link", { name: "External" });
    expect(link.getAttribute("href")).toBe("https://example.com");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer");
  });

  it("renders secondary variant classes", () => {
    render(
      <ButtonLink href="/el/contact" variant="secondary">
        Contact
      </ButtonLink>,
    );

    const link = screen.getByRole("link", { name: "Contact" });
    expect(link.className).toContain("border-ink/20");
    expect(link.className).toContain("text-ink");
    expect(link.className).toContain("hover:bg-trust-soft");
  });

  it("merges caller classes through the shared class composition boundary", () => {
    render(
      <ButtonLink href="/el/contact" className="px-8 bg-trust">
        Merge
      </ButtonLink>,
    );

    const link = screen.getByRole("link", { name: "Merge" });
    expect(link.className).toContain("px-8");
    expect(link.className).toContain("bg-trust");
    expect(link.className).not.toContain("px-5");
    expect(link.className).not.toContain("bg-ink");
  });
});

describe("MediaFrame", () => {
  it("renders with wide variant class by default", () => {
    const { container } = render(
      <MediaFrame
        media={{ url: "/test.jpg", width: 800, height: 600, alternativeText: null }}
        alt="test"
      />,
    );
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.className).toContain("media-frame");
    expect(frame.className).toContain("media-frame--wide");
  });

  it("renders with portrait variant class", () => {
    const { container } = render(
      <MediaFrame
        media={{ url: "/test.jpg", width: 600, height: 800, alternativeText: null }}
        alt="test"
        variant="portrait"
      />,
    );
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.className).toContain("media-frame");
    expect(frame.className).toContain("media-frame--portrait");
  });

  it("renders ph-stripe class when media has no url", () => {
    const { container } = render(<MediaFrame media={null} alt="no image" />);
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.className).toContain("ph-stripe");
  });

  it("does not render ph-stripe class when media url is present", () => {
    const { container } = render(
      <MediaFrame
        media={{ url: "/test.jpg", width: 800, height: 600, alternativeText: null }}
        alt="test"
      />,
    );
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.className).not.toContain("ph-stripe");
  });

  it("renders label", () => {
    render(<MediaFrame media={null} alt="test" label="Slide 1" />);
    expect(screen.getByText("Slide 1")).toBeDefined();
  });

  it("merges caller className", () => {
    const { container } = render(
      <MediaFrame
        media={{ url: "/test.jpg", width: 800, height: 600, alternativeText: null }}
        alt="test"
        className="custom-class"
      />,
    );
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.className).toContain("custom-class");
  });
});

describe("isExternalHref", () => {
  it("recognizes http and https URLs as external", () => {
    expect(isExternalHref("https://example.com")).toBe(true);
    expect(isExternalHref("http://example.com")).toBe(true);
  });

  it("treats local paths as internal", () => {
    expect(isExternalHref("/el/contact")).toBe(false);
  });
});
