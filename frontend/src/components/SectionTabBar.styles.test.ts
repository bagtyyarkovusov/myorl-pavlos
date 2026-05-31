import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/components/SectionTabBar.module.css"), "utf8");

describe("SectionTabBar mobile styles", () => {
  it("keeps the mobile tab rail as underline text while preserving scroll controls", () => {
    expect(css).toMatch(
      /@media\s*\(max-width: 767px\)[\s\S]*?\.tab-scroll-controls\s*\{[\s\S]*?display: flex/,
    );
    expect(css).not.toMatch(
      /@media\s*\(max-width: 767px\)[\s\S]*?\.tab\s*\{[\s\S]*?border-radius: var\(--radius-full\)/,
    );
    expect(css).not.toMatch(
      /@media\s*\(max-width: 767px\)[\s\S]*?\.tab--active\s*\{[\s\S]*?background: var\(--accent-soft\)/,
    );
  });
});
