import { describe, expect, it } from "vitest";

import { buildContactPointLd } from "./contact-point";

describe("buildContactPointLd", () => {
  it("generates a ContactPoint schema", () => {
    const ld = buildContactPointLd("211-01 94 618");

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("ContactPoint");
    expect(ld.telephone).toBe("211-01 94 618");
    expect(ld.contactType).toBe("Appointment");
    expect(ld.areaServed).toBe("GR");
    expect(ld.availableLanguage).toEqual(["Greek", "Russian"]);
  });
});
