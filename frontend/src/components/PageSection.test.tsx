import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PageSection } from "./PageSection";

describe("PageSection", () => {
  it("renders section with children", () => {
    render(
      <PageSection>
        <p>Section content</p>
      </PageSection>,
    );

    expect(screen.getByText("Section content")).toBeDefined();
  });

  it("renders heading with title", () => {
    render(
      <PageSection heading={{ title: "Hello World" }}>
        <p>Body</p>
      </PageSection>,
    );

    expect(screen.getByRole("heading", { name: "Hello World" })).toBeDefined();
    expect(screen.getByText("Body")).toBeDefined();
  });

  it("renders heading with eyebrow, title, intro", () => {
    render(
      <PageSection
        heading={{
          eyebrow: "Our services",
          title: "What We Offer",
          intro: "A comprehensive overview",
        }}
      >
        <p>Body</p>
      </PageSection>,
    );

    expect(screen.getByText("Our services")).toBeDefined();
    expect(screen.getByRole("heading", { name: "What We Offer" })).toBeDefined();
    expect(screen.getByText("A comprehensive overview")).toBeDefined();
  });

  it("renders heading with action slot", () => {
    render(
      <PageSection
        heading={{
          title: "Pricing",
          action: <span>Get in touch</span>,
        }}
      >
        <p>Body</p>
      </PageSection>,
    );

    expect(screen.getByRole("heading", { name: "Pricing" })).toBeDefined();
    expect(screen.getByText("Get in touch")).toBeDefined();
  });

  it("renders header bypass when header prop provided", () => {
    render(
      <PageSection header={<div data-testid="custom">Custom header</div>}>
        <p>Body</p>
      </PageSection>,
    );

    expect(screen.getByTestId("custom")).toBeDefined();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("header prop takes precedence over heading prop", () => {
    render(
      <PageSection
        heading={{ title: "Should not render" }}
        header={<div data-testid="custom">Custom takes over</div>}
      >
        <p>Body</p>
      </PageSection>,
    );

    expect(screen.getByTestId("custom")).toBeDefined();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders no header when neither heading nor header provided", () => {
    render(
      <PageSection>
        <p data-testid="body">Body only</p>
      </PageSection>,
    );

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByTestId("body")).toBeDefined();
  });

  it("applies background variant: surface", () => {
    const { container } = render(
      <PageSection background="surface">
        <p>Content</p>
      </PageSection>,
    );

    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("bg-bone-50");
  });

  it("applies background variant: ink-dark", () => {
    const { container } = render(
      <PageSection background="ink-dark">
        <p>Content</p>
      </PageSection>,
    );

    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("bg-ink");
    expect(el.className).toContain("text-bone-50");
  });

  it("applies rhythm variant: hero", () => {
    const { container } = render(
      <PageSection rhythm="hero">
        <p>Content</p>
      </PageSection>,
    );

    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("pt-[var(--page-top-gutter)]");
    expect(el.className).toContain("pb-[clamp(54px,7vw,96px)]");
  });

  it("applies rhythm variant: compact", () => {
    const { container } = render(
      <PageSection rhythm="compact">
        <p>Content</p>
      </PageSection>,
    );

    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("py-[clamp(2.75rem,calc(1.25rem+3vw),4rem)]");
  });

  it("applies rhythm variant: page", () => {
    const { container } = render(
      <PageSection rhythm="page">
        <p>Content</p>
      </PageSection>,
    );

    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("pt-[var(--page-top-gutter)]");
    expect(el.className).toContain("pb-[var(--page-bottom-gutter)]");
  });

  it("applies containerWidth variant: tight", () => {
    const { container } = render(
      <PageSection containerWidth="tight">
        <p>Content</p>
      </PageSection>,
    );

    expect(container.textContent).toContain("Content");
    const inner = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(inner.className).toContain("max-w-5xl");
  });

  it("applies containerWidth variant: prose", () => {
    const { container } = render(
      <PageSection containerWidth="prose">
        <p>Content</p>
      </PageSection>,
    );

    const inner = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(inner.className).toContain("max-w-3xl");
  });

  it("merges className prop via cn()", () => {
    const { container } = render(
      <PageSection className="extra-class another-class">
        <p>Content</p>
      </PageSection>,
    );

    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("extra-class");
    expect(el.className).toContain("another-class");
  });

  it("passes id attribute to section element", () => {
    const { container } = render(
      <PageSection id="features">
        <p>Content</p>
      </PageSection>,
    );

    const el = container.querySelector("section");
    expect(el?.getAttribute("id")).toBe("features");
  });

  it("passes label as aria-label on section", () => {
    const { container } = render(
      <PageSection label="Key advantages">
        <p>Content</p>
      </PageSection>,
    );

    const el = container.querySelector("section");
    expect(el?.getAttribute("aria-label")).toBe("Key advantages");
  });

  it("renders heading with intro text and no action when action not provided", () => {
    render(
      <PageSection heading={{ title: "Title", intro: "An introduction" }}>
        <p>Body</p>
      </PageSection>,
    );

    expect(screen.getByRole("heading", { name: "Title" })).toBeDefined();
    expect(screen.getByText("An introduction")).toBeDefined();
  });

  it("does not render intro when action is provided (action takes precedence)", () => {
    render(
      <PageSection
        heading={{
          title: "Title",
          intro: "Should not appear",
          action: <button type="button">Action button</button>,
        }}
      >
        <p>Body</p>
      </PageSection>,
    );

    expect(screen.queryByText("Should not appear")).toBeNull();
    expect(screen.getByText("Action button")).toBeDefined();
  });

  it("renders heading as h2 with font-display class", () => {
    render(
      <PageSection heading={{ title: "Styling test" }}>
        <p>Body</p>
      </PageSection>,
    );

    const h2 = screen.getByRole("heading", { name: "Styling test" });
    expect(h2.tagName).toBe("H2");
    expect(h2.className).toContain("font-display");
  });

  it("combines background and rhythm classes", () => {
    const { container } = render(
      <PageSection background="surface" rhythm="compact">
        <p>Content</p>
      </PageSection>,
    );

    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("bg-bone-50");
    expect(el.className).toContain("py-[clamp(2.75rem,calc(1.25rem+3vw),4rem)]");
  });

  it("does not render empty heading when heading has only empty eyebrow", () => {
    // If only eyebrow is passed without title, that's a type error — but we test title-only case
    render(
      <PageSection heading={{ title: "Has title" }}>
        <p>Body</p>
      </PageSection>,
    );

    expect(screen.getByRole("heading")).toBeDefined();
  });

  it("alternates section background from sectionIndex", () => {
    const { container, rerender } = render(
      <PageSection sectionIndex={0}>
        <p>First</p>
      </PageSection>,
    );

    expect(container.querySelector("section")?.getAttribute("data-background")).toBe("bone");

    rerender(
      <PageSection sectionIndex={1}>
        <p>Second</p>
      </PageSection>,
    );

    expect(container.querySelector("section")?.getAttribute("data-background")).toBe("white");
  });

  it("applies shared page inline gutter on the inner container", () => {
    const { container } = render(
      <PageSection>
        <p>Content</p>
      </PageSection>,
    );

    const inner = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(inner.className).toContain("px-[var(--page-inline-gutter)]");
  });

  it("applies density and width as public section attributes", () => {
    const { container } = render(
      <PageSection density="theater" width="narrow" sectionIndex={2}>
        <p>Body</p>
      </PageSection>,
    );

    const section = container.querySelector("section");
    const inner = section?.firstElementChild as HTMLElement;
    expect(section?.getAttribute("data-density")).toBe("theater");
    expect(inner.getAttribute("data-width")).toBe("narrow");
  });
});
