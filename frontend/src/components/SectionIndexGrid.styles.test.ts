import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const indexCss = readFileSync(
  join(process.cwd(), "src/components/SectionIndexGrid.module.css"),
  "utf8",
);
const sharedCss = readFileSync(
  join(process.cwd(), "src/components/shared-layout.module.css"),
  "utf8",
);

describe("SectionIndexGrid filter-pill styles", () => {
  it("paints the selected chip with a solid accent fill and near-white text", () => {
    // The base `.filter-pill--active {}` rule (not the :hover/:focus-visible variants)
    // must stay solid accent + bone-50 so the selected chip is readable at rest.
    expect(indexCss).toMatch(
      /\.filter-pill--active\s*\{[^}]*background:\s*var\(--accent\)[^}]*color:\s*var\(--color-bone-50\)/,
    );
    // It must never be the pale soft tint by default.
    expect(indexCss).not.toMatch(
      /\.filter-pill--active\s*\{[^}]*background:\s*var\(--accent-soft\)/,
    );
  });

  it("exposes an enhanced keyboard focus ring on filter chips", () => {
    expect(indexCss).toMatch(
      /\.filter-pill:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)[^}]*outline-offset:\s*2px/,
    );
  });

  it("gates the active-chip hover deepen behind a real pointer (no touch sticky-hover)", () => {
    expect(indexCss).toMatch(
      /@media\s*\(hover:\s*hover\)\s*\{[\s\S]*?\.filter-pill\.filter-pill--active:hover/,
    );
  });

  it("gates the shared inline-pill hover behind a real pointer", () => {
    expect(sharedCss).toMatch(
      /@media\s*\(hover:\s*hover\)\s*\{[\s\S]*?\.inline-pill:hover/,
    );
    // No ungated `.inline-pill:hover` may survive: every occurrence is inside the
    // hover media query, so the only match for the selector is the gated one.
    const hoverMatches = sharedCss.match(/\.inline-pill:hover/g) ?? [];
    expect(hoverMatches).toHaveLength(1);
  });
});
