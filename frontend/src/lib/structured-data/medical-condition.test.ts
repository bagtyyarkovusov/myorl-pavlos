import { describe, expect, it } from "vitest";

import { buildMedicalConditionLd } from "./medical-condition";

describe("buildMedicalConditionLd", () => {
  it("generates a MedicalCondition schema with required fields", () => {
    const ld = buildMedicalConditionLd({
      title: "Ωτίτιδα",
      pageUrl: "https://myorl.example.com/el/otitis",
      locale: "el",
    });

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("MedicalCondition");
    expect(ld.name).toBe("Ωτίτιδα");
    expect(ld.url).toBe("https://myorl.example.com/el/otitis");
    expect(ld.inLanguage).toBe("el");
  });

  it("includes description when provided", () => {
    const ld = buildMedicalConditionLd({
      title: "Ωτίτιδα",
      pageUrl: "https://myorl.example.com/el/otitis",
      description: "Φλεγμονή του ωτός που προκαλεί πόνο και πυρετό",
      locale: "el",
    });

    expect(ld.description).toBe("Φλεγμονή του ωτός που προκαλεί πόνο και πυρετό");
  });

  it("omits description when not provided", () => {
    const ld = buildMedicalConditionLd({
      title: "Ωτίτιδα",
      pageUrl: "https://myorl.example.com/el/otitis",
      locale: "el",
    });

    expect(ld).not.toHaveProperty("description");
  });

  it("does not include Phase 2 fields", () => {
    const ld = buildMedicalConditionLd({
      title: "Ωτίτιδα",
      pageUrl: "https://myorl.example.com/el/otitis",
      locale: "el",
    });

    expect(ld).not.toHaveProperty("signOrSymptom");
    expect(ld).not.toHaveProperty("associatedAnatomy");
  });
});
