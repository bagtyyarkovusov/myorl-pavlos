import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHero } from "./PageHero";

describe("PageHero", () => {
  it("renders a minimal hero with breadcrumbs and no media frame", () => {
    const { container } = render(
      <PageHero
        page={{
          title: "Clinical guide",
          excerpt: "Reference material",
          featuredImage: null,
          imageCenter: null,
        }}
        breadcrumbs={[
          { label: "Home", href: "/el" },
          { label: "Guides", href: "/el/guides" },
        ]}
        variant="minimal"
      />,
    );

    expect(screen.getByRole("heading", { name: "Clinical guide" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/el");
    expect(container.querySelector("[data-hero-variant='minimal']")).toBeTruthy();
    expect(container.querySelector("[data-hero-media]")).toBeNull();
  });

  it("renders a cinematic hero with featured media and overlaid CTA", () => {
    const { container } = render(
      <PageHero
        page={{
          title: "Implant service",
          excerpt: "Treatment plan",
          featuredImage: {
            url: "/implant.jpg",
            alternativeText: "Implant room",
            width: 1200,
            height: 800,
          },
          imageCenter: null,
        }}
        cta={{ label: "Book consultation", href: "/el/appointment" }}
        variant="cinematic"
      />,
    );

    expect(screen.getByRole("heading", { name: "Implant service" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Book consultation" })).toHaveAttribute(
      "href",
      "/el/appointment",
    );
    expect(container.querySelector("[data-hero-variant='cinematic']")).toBeTruthy();
    expect(container.querySelector("[data-hero-media]")).toBeTruthy();
  });

  it("renders compact metadata for reference articles without media", () => {
    const { container } = render(
      <PageHero
        page={{
          title: "Sinus reference",
          excerpt: "A dense clinical reference",
          featuredImage: {
            url: "/sinus.jpg",
            alternativeText: "Sinus",
            width: 1200,
            height: 800,
          },
          imageCenter: null,
        }}
        metadata={["4 min read", "Updated clinical review"]}
        variant="compact"
      />,
    );

    expect(screen.getByRole("heading", { name: "Sinus reference" })).toBeDefined();
    expect(screen.getByText("4 min read")).toBeDefined();
    expect(screen.getByText("Updated clinical review")).toBeDefined();
    expect(container.querySelector("[data-hero-variant='compact']")).toBeTruthy();
    expect(container.querySelector("[data-hero-media]")).toBeNull();
  });

  it("renders journal author metadata and portrait", () => {
    const { container } = render(
      <PageHero
        page={{
          title: "Specialized rhinology",
          excerpt: null,
          featuredImage: null,
          imageCenter: {
            url: "/author.jpg",
            alternativeText: "Dr Author",
            width: 320,
            height: 320,
          },
        }}
        metadata={["Dr Author", "Sources included"]}
        variant="journal"
      />,
    );

    expect(screen.getByRole("heading", { name: "Specialized rhinology" })).toBeDefined();
    expect(screen.getByText("Dr Author")).toBeDefined();
    expect(screen.getByText("Sources included")).toBeDefined();
    expect(container.querySelector("[data-hero-variant='journal']")).toBeTruthy();
    expect(container.querySelector("[data-hero-portrait]")).toBeTruthy();
  });
});
