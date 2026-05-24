import { describe, expect, it } from "vitest";

import {
  canSwitchToLocale,
  hasLoadedAlternateUrls,
  isLocaleSwitchBlocked,
  resolveLocaleHref,
  switchLocaleInPath,
} from "./locale-href";

describe("switchLocaleInPath", () => {
  it("replaces locale prefix in path", () => {
    expect(switchLocaleInPath("/el/services", "ru")).toBe("/ru/services");
  });

  it("prefixes locale when path has no locale", () => {
    expect(switchLocaleInPath("/services", "ru")).toBe("/ru/services");
  });
});

describe("hasLoadedAlternateUrls", () => {
  it("returns false for an empty map", () => {
    expect(hasLoadedAlternateUrls({})).toBe(false);
  });

  it("returns true once alternates are present", () => {
    expect(hasLoadedAlternateUrls({ ru: "/ru/fillers" })).toBe(true);
  });
});

describe("isLocaleSwitchBlocked", () => {
  it("blocks switching when alternates are loaded without a target partner", () => {
    expect(
      isLocaleSwitchBlocked("el", {
        ru: "http://localhost:3000/ru/fillers",
      }),
    ).toBe(true);
  });

  it("does not block before alternates are loaded", () => {
    expect(isLocaleSwitchBlocked("el", {})).toBe(false);
  });
});

describe("canSwitchToLocale", () => {
  it("allows switching when a partner URL exists", () => {
    expect(
      canSwitchToLocale("ru", {
        el: "/el/about",
        ru: "/ru/o-nas",
      }),
    ).toBe(true);
  });

  it("blocks switching to a missing partner once alternates are loaded", () => {
    expect(
      canSwitchToLocale("el", {
        ru: "/ru/fillers",
      }),
    ).toBe(false);
  });
});

describe("resolveLocaleHref", () => {
  it("uses alternate URL when available", () => {
    expect(
      resolveLocaleHref("/el/about", "ru", {
        el: "/el/about",
        ru: "/ru/o-nas",
      }),
    ).toBe("/ru/o-nas");
  });

  it("falls back to pathname swap before alternates are loaded", () => {
    expect(resolveLocaleHref("/el/services", "ru", {})).toBe("/ru/services");
  });
});
