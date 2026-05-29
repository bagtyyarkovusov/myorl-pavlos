import { describe, expect, it } from "vitest";

import { resolveFooterNavLabel } from "./footer-nav-labels";

describe("resolveFooterNavLabel", () => {
  it("localizes known Greek footer slugs and English loanwords", () => {
    expect(resolveFooterNavLabel("el", "video", "Video")).toBe("Βίντεο");
    expect(resolveFooterNavLabel("el", "rantevou", "Κλείστε ραντεβού Online")).toBe(
      "Κλείστε ραντεβού ηλεκτρονικά",
    );
    expect(resolveFooterNavLabel("el", "other", "Online ραντεβού")).toBe(
      "Κλείστε ραντεβού ηλεκτρονικά",
    );
  });

  it("leaves Russian labels unchanged", () => {
    expect(resolveFooterNavLabel("ru", "video", "Video")).toBe("Video");
  });
});
