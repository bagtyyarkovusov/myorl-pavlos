import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readCss(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function extractRuleBlock(css: string, selector: string): string {
  const index = css.indexOf(selector);
  expect(index, `${selector} should exist in stylesheet`).toBeGreaterThanOrEqual(0);
  const blockStart = css.indexOf("{", index);
  const blockEnd = css.indexOf("}", blockStart);
  expect(blockStart, `${selector} should have a rule block`).toBeGreaterThanOrEqual(0);
  expect(blockEnd, `${selector} should close its rule block`).toBeGreaterThan(blockStart);
  return css.slice(blockStart, blockEnd + 1);
}

describe("SiteFooter.module.css spacing contracts", () => {
  it("does not add external top margin before the footer", () => {
    const css = readCss("./SiteFooter.module.css");
    const footerBlock = extractRuleBlock(css, ".site-footer");

    expect(footerBlock).not.toMatch(/margin-top\s*:/);
  });

  it("keeps top breathing room on the inner footer shell", () => {
    const css = readCss("./SiteFooter.module.css");
    const innerBlock = extractRuleBlock(css, ".site-footer__inner");

    expect(innerBlock).toMatch(/padding-block-start\s*:/);
  });
});
