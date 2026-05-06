import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { HomeHero } from "./HomeHero";

describe("HomeHero", () => {
  it("renders with next/image instead of raw img", () => {
    render(
      <HomeHero
        kicker="Welcome"
        title="MyORL Clinic"
        excerpt="Expert ENT care in Athens"
        ctaHref="/el/contact"
        ctaLabel="Contact us"
      />,
    );

    const image = screen.getByRole("img", { name: /MyORL practice interior/i });
    expect(image).toBeDefined();
    expect(image.tagName.toLowerCase()).toBe("img");
    // Next.js Image with `fill` adds a wrapper span; verify the img has no
    // `loading="eager"` or `fetchpriority` raw attributes (those are handled
    // by Next.js internally via the `priority` prop).
    expect(image.hasAttribute("loading")).toBe(false);
    expect(image.hasAttribute("fetchpriority")).toBe(false);
  });

  it("uses CMS media when provided", () => {
    render(
      <HomeHero
        kicker="Welcome"
        title="MyORL Clinic"
        media={{
          url: "/custom-hero.jpg",
          alternativeText: "Custom hero image",
          width: 1200,
          height: 800,
        }}
        ctaHref="/el/contact"
        ctaLabel="Contact us"
      />,
    );

    expect(screen.getByRole("img", { name: "Custom hero image" })).toBeDefined();
  });
});
