import { describe, expect, it } from "vitest";

import { buildPhysicianLd } from "./physician";

describe("buildPhysicianLd", () => {
  it("generates a Physician schema with required fields", () => {
    const ld = buildPhysicianLd({
      pageUrl: "https://myorl.example.com/el/viografiko",
      locale: "el",
    });

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Physician");
    expect(ld.name).toBe("Δρ. Παύλος Τσολαρίδης");
    expect(ld.url).toBe("https://myorl.example.com/el/viografiko");
    expect(ld.medicalSpecialty).toBe("Otorhinolaryngology");
    expect(ld.inLanguage).toBe("el");
  });

  it("includes description when provided", () => {
    const ld = buildPhysicianLd({
      pageUrl: "https://myorl.example.com/el/viografiko",
      description: "Ωτορινολαρυγγολόγος στην Αθήνα",
      locale: "el",
    });

    expect(ld.description).toBe("Ωτορινολαρυγγολόγος στην Αθήνα");
  });

  it("omits description when not provided", () => {
    const ld = buildPhysicianLd({
      pageUrl: "https://myorl.example.com/el/viografiko",
      locale: "el",
    });

    expect(ld).not.toHaveProperty("description");
  });

  it("does not include Phase 2 fields", () => {
    const ld = buildPhysicianLd({
      pageUrl: "https://myorl.example.com/el/viografiko",
      locale: "el",
    });

    expect(ld).not.toHaveProperty("identifier");
    expect(ld).not.toHaveProperty("memberOf");
    expect(ld).not.toHaveProperty("alumniOf");
    expect(ld).not.toHaveProperty("award");
  });
});
