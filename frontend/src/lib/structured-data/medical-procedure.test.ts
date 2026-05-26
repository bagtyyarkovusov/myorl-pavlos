import { describe, expect, it } from "vitest";

import { buildMedicalProcedureLd } from "./medical-procedure";

describe("buildMedicalProcedureLd", () => {
  it("generates a MedicalProcedure schema with required fields", () => {
    const ld = buildMedicalProcedureLd({
      title: "Ρινοπλαστική",
      pageUrl: "https://myorl.example.com/el/rinoplasty",
      locale: "el",
    });

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("MedicalProcedure");
    expect(ld.name).toBe("Ρινοπλαστική");
    expect(ld.url).toBe("https://myorl.example.com/el/rinoplasty");
    expect(ld.inLanguage).toBe("el");
  });

  it("includes description when provided", () => {
    const ld = buildMedicalProcedureLd({
      title: "Ρινοπλαστική",
      pageUrl: "https://myorl.example.com/el/rinoplasty",
      description: "Χειρουργική επέμβαση για τη βελτίωση της μύτης",
      locale: "el",
    });

    expect(ld.description).toBe("Χειρουργική επέμβαση για τη βελτίωση της μύτης");
  });

  it("omits description when not provided", () => {
    const ld = buildMedicalProcedureLd({
      title: "Ρινοπλαστική",
      pageUrl: "https://myorl.example.com/el/rinoplasty",
      locale: "el",
    });

    expect(ld).not.toHaveProperty("description");
  });

  it("does not include Phase 2 fields", () => {
    const ld = buildMedicalProcedureLd({
      title: "Ρινοπλαστική",
      pageUrl: "https://myorl.example.com/el/rinoplasty",
      locale: "el",
    });

    expect(ld).not.toHaveProperty("procedureType");
    expect(ld).not.toHaveProperty("bodyLocation");
  });
});
