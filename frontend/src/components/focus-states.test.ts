import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readCss(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function expectVisibleOutline(css: string, selector: string) {
  let index = css.indexOf(selector);
  let foundVisibleOutline = false;

  while (index >= 0) {
    const blockStart = css.indexOf("{", index);
    const blockEnd = css.indexOf("}", blockStart);
    const block = blockStart >= 0 && blockEnd >= 0 ? css.slice(blockStart, blockEnd + 1) : "";
    foundVisibleOutline ||= /outline\s*:\s*(?!none\b)[^;]+;/.test(block);
    index = css.indexOf(selector, index + selector.length);
  }

  expect(foundVisibleOutline, `${selector} should define a visible focus outline`).toBe(true);
}

describe("focus-visible styling contracts", () => {
  it("keeps disclosure and tab controls visibly focusable", () => {
    const css = readCss("./sections/SectionRenderer.module.css");

    expectVisibleOutline(css, ".disclosure__summary:focus-visible");
    expectVisibleOutline(css, ".tabs__tab:focus-visible");
  });

  it("keeps lightbox controls visibly focusable", () => {
    const css = readCss("./Lightbox.module.css");

    expectVisibleOutline(css, ".close:focus-visible");
    expectVisibleOutline(css, ".nav:focus-visible");
  });

  it("keeps footer links visibly focusable", () => {
    const css = readCss("./SiteFooter.module.css");

    expectVisibleOutline(css, ".link-list a:focus-visible");
    expectVisibleOutline(css, ".contact-block a:focus-visible");
    expectVisibleOutline(css, ".social-list a:focus-visible");
    expectVisibleOutline(css, ".bottom-link:focus-visible");
  });

  it("keeps contact interactions visibly focusable", () => {
    const contactCss = readCss("./page-layouts/_shared.module.css");
    const visitCss = readCss("./home/HomeVisitMapSection.module.css");

    expectVisibleOutline(contactCss, ".contact-phone:focus-visible");
    expectVisibleOutline(contactCss, ".contact-email:focus-visible");
    expectVisibleOutline(contactCss, ".clinic-trigger:focus-visible");
    expectVisibleOutline(contactCss, ".clinic-body a:focus-visible");
    expectVisibleOutline(contactCss, ".clinic-pin:focus-visible");
    expectVisibleOutline(visitCss, ".meta-value a:focus-visible");
    expectVisibleOutline(visitCss, ".tel:focus-visible");
  });
});
