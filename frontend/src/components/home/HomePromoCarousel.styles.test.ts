import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  join(process.cwd(), "src/components/home/HomePromoCarousel.module.css"),
  "utf8",
);

describe("HomePromoCarousel focus/hover h3 styles", () => {
  it("uses accent-ink (not accent-soft) for the h3 on mobile focus/hover", () => {
    // On mobile the copy panel is on a light bone surface. `--accent-ink` (#17406f)
    // keeps the title readable (~11:1 contrast, WCAG AAA).
    expect(css).toMatch(
      /\.topic-feature:has\(\.topic-feature__primary-link:focus-visible\)[^{]*\.topic-feature__copy h3[^{]*\{[^}]*color:\s*var\(--accent-ink\)/,
    );
  });

  it("does not paint the h3 with the pale accent-soft on focus/hover (would be invisible on light bg)", () => {
    // `--accent-soft` (#e4edf8) is near-white — invisible against the bone surface on mobile.
    // There must be no rule that maps focus/hover h3 to --accent-soft.
    expect(css).not.toMatch(
      /\.topic-feature:has\(\.topic-feature__primary-link:(?:hover|focus-visible)\)[^{]*\.topic-feature__copy h3[^{]*\{[^}]*color:\s*var\(--accent-soft/,
    );
  });

  it("overrides the h3 to teal-soft on desktop (≥860px) where the dark overlay makes it readable", () => {
    // The desktop block applies a dark ::before overlay so teal-soft (a light colour)
    // remains readable. This override must stay inside the 860px media query.
    expect(css).toMatch(
      /@media\s*\(min-width:\s*860px\)[\s\S]*?\.topic-feature:has\(\.topic-feature__primary-link:focus-visible\)[^{]*\.topic-feature__copy h3[^{]*\{[^}]*color:\s*var\(--color-teal-soft\)/,
    );
  });
});
