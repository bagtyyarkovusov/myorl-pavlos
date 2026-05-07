import { describe, expect, it } from "vitest";

import { getDensityForPage } from "./density";

describe("getDensityForPage", () => {
  it("uses theater density for home pages", () => {
    expect(getDensityForPage("home", "standard")).toBe("theater");
  });

  it("uses scanning density for system index variants", () => {
    expect(getDensityForPage("system", "section-index")).toBe("scanning");
    expect(getDensityForPage("system", "encyclopedia-index")).toBe("scanning");
  });

  it("uses focused density for content sections by default", () => {
    expect(getDensityForPage("content", "service-article")).toBe("focused");
    expect(getDensityForPage("faq", "standard")).toBe("focused");
  });
});
