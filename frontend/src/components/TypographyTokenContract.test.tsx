import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/* ── helpers ── */

/** Extract the `:root { … }` block from globals.css. */
function rootBlock(css: string): string {
  const m = css.match(/:root\s*\{([^}]*)\}/);
  if (!m) throw new Error(":root block not found in globals.css");
  return m[1]!;
}

/** Pull a custom property value from a CSS string. */
function customPropValue(css: string, name: string): string | undefined {
  const re = new RegExp(`${name}:\\s*([^;]+);`);
  return css.match(re)?.[1]?.trim();
}

describe("Typography Token Contract", () => {
  /* ── Token presence ── */

  it("defines --type-prose as a fixed rem value", () => {
    const v = customPropValue(rootBlock(globalsCss), "--type-prose");
    expect(v).toBeDefined();
    expect(v).toMatch(/^\d+(\.\d+)?rem$/);
  });

  it("defines --type-prose-compact as a fixed rem value", () => {
    const v = customPropValue(rootBlock(globalsCss), "--type-prose-compact");
    expect(v).toBeDefined();
    expect(v).toMatch(/^\d+(\.\d+)?rem$/);
  });

  it("defines --type-heading-1 through --type-heading-6 as fixed rem values", () => {
    for (let i = 1; i <= 6; i++) {
      const v = customPropValue(rootBlock(globalsCss), `--type-heading-${i}`);
      expect(v, `--type-heading-${i}`).toBeDefined();
      expect(v, `--type-heading-${i} must be fixed rem`).toMatch(/^\d+(\.\d+)?rem$/);
    }
  });

  it("defines label tokens as fixed rem values", () => {
    const label = customPropValue(rootBlock(globalsCss), "--type-label");
    expect(label).toBeDefined();
    expect(label).toMatch(/^\d+(\.\d+)?rem$/);

    const large = customPropValue(rootBlock(globalsCss), "--type-label-large");
    expect(large).toBeDefined();
    expect(large).toMatch(/^\d+(\.\d+)?rem$/);
  });

  it("defines navigation tokens as fixed rem values", () => {
    const nav = customPropValue(rootBlock(globalsCss), "--type-nav");
    expect(nav).toBeDefined();
    expect(nav).toMatch(/^\d+(\.\d+)?rem$/);

    const compact = customPropValue(rootBlock(globalsCss), "--type-nav-compact");
    expect(compact).toBeDefined();
    expect(compact).toMatch(/^\d+(\.\d+)?rem$/);
  });

  it("defines card tokens as fixed rem values", () => {
    const title = customPropValue(rootBlock(globalsCss), "--type-card-title");
    expect(title).toBeDefined();
    expect(title).toMatch(/^\d+(\.\d+)?rem$/);

    const body = customPropValue(rootBlock(globalsCss), "--type-card-body");
    expect(body).toBeDefined();
    expect(body).toMatch(/^\d+(\.\d+)?rem$/);
  });

  it("defines table tokens as fixed rem values", () => {
    const header = customPropValue(rootBlock(globalsCss), "--type-table-header");
    expect(header).toBeDefined();
    expect(header).toMatch(/^\d+(\.\d+)?rem$/);

    const cell = customPropValue(rootBlock(globalsCss), "--type-table-cell");
    expect(cell).toBeDefined();
    expect(cell).toMatch(/^\d+(\.\d+)?rem$/);

    const caption = customPropValue(rootBlock(globalsCss), "--type-table-caption");
    expect(caption).toBeDefined();
    expect(caption).toMatch(/^\d+(\.\d+)?rem$/);
  });

  it("defines leading tokens as unitless values", () => {
    const normal = customPropValue(rootBlock(globalsCss), "--type-leading-normal");
    expect(normal).toBeDefined();
    expect(Number(normal)).toBeGreaterThan(1);
    expect(Number(normal)).toBeLessThan(2);

    const tight = customPropValue(rootBlock(globalsCss), "--type-leading-tight");
    expect(tight).toBeDefined();
    expect(Number(tight)).toBeLessThan(Number(normal));
  });

  /* ── CMS prose: fixed rem, no viewport fragility ── */

  it("sets .cms-html body font-size to a fixed rem token (not clamp / vw / calc)", () => {
    // Find the .cms-html rule block
    const rule = globalsCss.match(/\.cms-html\s*\{([^}]*)\}/);
    expect(rule).toBeTruthy();
    const body = rule![1]!;

    // Must reference a type token
    expect(body).toMatch(/font-size:\s*var\(--type-prose/);

    // Must not use viewport-driven sizing
    expect(body).not.toMatch(/font-size:.*vw/);
    expect(body).not.toMatch(/font-size:.*clamp/);
    expect(body).not.toMatch(/font-size:.*calc/);
  });

  it("sets .cms-html h2 font-size to a heading token (not clamp / vw)", () => {
    const matches = [...globalsCss.matchAll(/\.cms-html\s+h2\s*\{([^}]*)/g)];
    const block = matches.map((m) => m[1]!).find((b) => b.includes("font-size:"));
    expect(block).toBeDefined();

    expect(block!).toMatch(/font-size:\s*var\(--type-heading-2\)/);
    expect(block!).not.toMatch(/font-size:.*vw/);
    expect(block!).not.toMatch(/font-size:.*clamp/);
  });

  it("sets .cms-html h3 font-size to a heading token (not clamp / vw)", () => {
    // The combined h2,\nh3 rule matches first; find the individual rule.
    const matches = [...globalsCss.matchAll(/\.cms-html\s+h3\s*\{([^}]*)/g)];
    const block = matches.map((m) => m[1]!).find((b) => b.includes("font-size:"));
    expect(block).toBeDefined();

    expect(block!).toMatch(/font-size:\s*var\(--type-heading-3\)/);
    expect(block!).not.toMatch(/font-size:.*vw/);
    expect(block!).not.toMatch(/font-size:.*clamp/);
  });

  it("uses fixed rem heading tokens for h4, h5, h6 (no clamp / vw)", () => {
    for (const tag of ["h4", "h5", "h6"]) {
      // There may be a combined selector rule first. Find the individual
      // rule that actually carries the font-size.
      const matches = [
        ...globalsCss.matchAll(new RegExp(String.raw`\.cms-html\s+${tag}\s*\{([^}]*)`, "gs")),
      ];
      const block = matches.map((m) => m[1]!).find((b) => b.includes("font-size:"));
      expect(block, `.cms-html ${tag} must have a rule with font-size`).toBeDefined();
      expect(block!, `.cms-html ${tag} must use heading token`).toMatch(
        /font-size:\s*var\(--type-heading-[4-6]\)/,
      );
      expect(block!, `.cms-html ${tag} must not use vw`).not.toMatch(/font-size:.*vw/);
      expect(block!, `.cms-html ${tag} must not use clamp`).not.toMatch(/font-size:.*clamp/);
    }
  });

  /* ── Prose variant headings: fixed rem tokens, no viewport fragility ── */

  it("sets .prose-encyclopedia headings to fixed rem heading tokens (not em / clamp / vw)", () => {
    for (const [tag, token] of [
      ["h2", "heading-3"],
      ["h3", "heading-5"],
      ["h4", "heading-5"],
      ["h5", "heading-6"],
      ["h6", "heading-6"],
    ] as const) {
      const matches = [
        ...globalsCss.matchAll(
          new RegExp(String.raw`\.prose-encyclopedia\s+${tag}\s*\{([^}]*)`, "gs"),
        ),
      ];
      const block = matches.map((m) => m[1]!).find((b) => b.includes("font-size:"));
      expect(block, `.prose-encyclopedia ${tag} must have a rule with font-size`).toBeDefined();
      expect(block!, `.prose-encyclopedia ${tag} must use --type-${token}`).toMatch(
        new RegExp(`font-size:\\s*var\\(--type-${token}\\)`),
      );
      expect(block!, `.prose-encyclopedia ${tag} must not use em`).not.toMatch(
        /font-size:\s*[\d.]+em/,
      );
      expect(block!, `.prose-encyclopedia ${tag} must not use vw`).not.toMatch(/font-size:.*vw/);
      expect(block!, `.prose-encyclopedia ${tag} must not use clamp`).not.toMatch(
        /font-size:.*clamp/,
      );
    }
  });

  it("sets .prose-service h3 font-size to a heading token (not em / clamp / vw)", () => {
    const matches = [...globalsCss.matchAll(/\.prose-service\s+h3\s*\{([^}]*)/g)];
    const block = matches.map((m) => m[1]!).find((b) => b.includes("font-size:"));
    expect(block).toBeDefined();
    expect(block!).toMatch(/font-size:\s*var\(--type-heading-4\)/);
    expect(block!).not.toMatch(/font-size:\s*[\d.]+em/);
    expect(block!).not.toMatch(/font-size:.*vw/);
    expect(block!).not.toMatch(/font-size:.*clamp/);
  });

  /* ── Table typography ── */

  it("applies table typography tokens to .cms-html th", () => {
    // Find the rule that actually contains font-size (skip combined
    // overflow-wrap rule that also matches th).
    const matches = [...globalsCss.matchAll(/\.cms-html\s+th\s*\{([^}]*)/g)];
    const block = matches.map((m) => m[1]!).find((b) => b.includes("font-size:"));
    expect(block).toBeDefined();
    expect(block!).toMatch(/font-size:\s*var\(--type-table-header\)/);
  });

  it("applies table typography tokens to .cms-html td", () => {
    const matches = [...globalsCss.matchAll(/\.cms-html\s+td\s*\{([^}]*)/g)];
    const block = matches.map((m) => m[1]!).find((b) => b.includes("font-size:"));
    expect(block).toBeDefined();
    expect(block!).toMatch(/font-size:\s*var\(--type-table-cell\)/);
  });

  it("applies table caption token to .cms-html caption", () => {
    const rule = globalsCss.match(/\.cms-html\s+caption\s*\{([^}]*)\}/);
    expect(rule).toBeTruthy();
    expect(rule![1]!).toMatch(/font-size:\s*var\(--type-table-caption\)/);
  });

  /* ── Typeface ── */

  it("assigns Roboto Condensed as the canonical public UI typeface", () => {
    // All three font-family tokens must reference --font-roboto-condensed
    for (const family of ["--font-display", "--font-sans", "--font-mono"]) {
      const re = new RegExp(`${family}:\\s*([^;]+);`);
      const m = globalsCss.match(re);
      expect(m, `${family} must be defined in @theme`).toBeTruthy();
      expect(m![1], `${family} must reference Roboto Condensed`).toMatch(/Roboto Condensed/);
    }
  });

  /* ── No large-clamp overrides in CMS prose ── */

  it("has no desktop overrides that blow up CMS h2/h3 beyond heading tokens", () => {
    // The old block at lines 474-482 boosted h2 to 3rem / h3 to 2.1rem on desktop.
    // That block must be gone.
    const override = globalsCss.match(
      /\.cms-html:not\(\.prose-[a-z]+\):not\(\.prose-[a-z]+\):not\(\.prose-[a-z]+\)\s+h2\s*\{[^}]*font-size:\s*3rem/,
    );
    expect(override).toBeNull();
  });

  /* ── Prose container measure ── */

  it("caps prose containers at 65-75ch readable line length", () => {
    const cmsHtml = globalsCss.match(/\.cms-html\s*\{([^}]*)\}/);
    expect(cmsHtml).toBeTruthy();
    const body = cmsHtml![1]!;
    // .cms-html uses `min(820px, var(--type-measure-prose, 72ch))`.
    // The measure token must reference a ch value in the 65–75 range.
    expect(body).toMatch(/max-width:.*7[0-5]ch/);
  });
});
