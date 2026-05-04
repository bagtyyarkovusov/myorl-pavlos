import { describe, expect, it } from "vitest";

import { localeToGoogleLanguageCode } from "./places";

describe("localeToGoogleLanguageCode", () => {
  it("maps site locales to Places API languageCode", () => {
    expect(localeToGoogleLanguageCode("el")).toBe("el");
    expect(localeToGoogleLanguageCode("ru")).toBe("ru");
  });
});
