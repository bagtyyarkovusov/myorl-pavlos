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

  it("includes datePublished and dateModified when provided", () => {
    const ld = buildMedicalConditionLd({
      title: "Ωτίτιδα",
      pageUrl: "https://myorl.example.com/el/otitis",
      locale: "el",
      datePublished: "2024-06-15",
      dateModified: "2024-12-01",
    });

    expect(ld.datePublished).toBe("2024-06-15");
    expect(ld.dateModified).toBe("2024-12-01");
  });

  it("omits datePublished and dateModified when not provided", () => {
    const ld = buildMedicalConditionLd({
      title: "Ωτίτιδα",
      pageUrl: "https://myorl.example.com/el/otitis",
      locale: "el",
    });

    expect(ld).not.toHaveProperty("datePublished");
    expect(ld).not.toHaveProperty("dateModified");
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

  it("includes reviewedBy and lastReviewed when both are provided", () => {
    const ld = buildMedicalConditionLd({
      title: "Ωτίτιδα",
      pageUrl: "https://myorl.example.com/el/otitis",
      locale: "el",
      reviewedBy: "Δρ. Παύλος Τσολαρίδης",
      lastReviewed: "2025-01-15",
    });

    expect(ld.reviewedBy).toEqual({
      "@type": "Person",
      name: "Δρ. Παύλος Τσολαρίδης",
    });
    expect(ld.lastReviewed).toBe("2025-01-15");
  });

  it("omits reviewedBy and lastReviewed when only one is provided", () => {
    const ld = buildMedicalConditionLd({
      title: "Ωτίτιδα",
      pageUrl: "https://myorl.example.com/el/otitis",
      locale: "el",
      lastReviewed: "2025-01-15",
    });

    expect(ld).not.toHaveProperty("reviewedBy");
    expect(ld).not.toHaveProperty("lastReviewed");
  });
});
