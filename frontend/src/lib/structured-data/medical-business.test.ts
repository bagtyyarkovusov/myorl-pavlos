import { describe, expect, it } from "vitest";

import { buildMedicalBusinessLd } from "./medical-business";

describe("buildMedicalBusinessLd", () => {
  it("generates a MedicalBusiness schema with required fields", () => {
    const ld = buildMedicalBusinessLd({
      siteUrl: "https://myorl.example.com",
      name: "MyORL",
      description: "Bilingual ORL clinic in Athens",
    });

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("MedicalBusiness");
    expect(ld.name).toBe("MyORL");
    expect(ld.url).toBe("https://myorl.example.com");
    expect(ld.description).toBe("Bilingual ORL clinic in Athens");
  });

  it("includes telephone when provided", () => {
    const ld = buildMedicalBusinessLd({
      siteUrl: "https://myorl.example.com",
      name: "MyORL",
      telephone: "+30 210 1234567",
    });

    expect(ld.telephone).toBe("+30 210 1234567");
  });

  it("includes address when provided", () => {
    const ld = buildMedicalBusinessLd({
      siteUrl: "https://myorl.example.com",
      name: "MyORL",
      address: "123 Athens St, Greece",
    });

    expect(ld.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "123 Athens St, Greece",
      addressCountry: "GR",
    });
  });

  it("includes medical specialty", () => {
    const ld = buildMedicalBusinessLd({
      siteUrl: "https://myorl.example.com",
      name: "MyORL",
    });

    expect(ld.medicalSpecialty).toEqual({
      "@type": "MedicalSpecialty",
      name: "Otolaryngology",
    });
  });

  it("includes image array when provided", () => {
    const ld = buildMedicalBusinessLd({
      siteUrl: "https://myorl.example.com",
      name: "MyORL",
      imageUrls: ["https://myorl.example.com/og.jpg"],
    });

    expect(ld.image).toEqual(["https://myorl.example.com/og.jpg"]);
  });

  it("omits optional fields when not provided", () => {
    const ld = buildMedicalBusinessLd({
      siteUrl: "https://myorl.example.com",
      name: "MyORL",
    });

    expect(ld.telephone).toBeUndefined();
    expect(ld.address).toBeUndefined();
    expect(ld.image).toBeUndefined();
    expect(ld.description).toBeUndefined();
  });

  it("includes aggregate rating when provided", () => {
    const ld = buildMedicalBusinessLd({
      siteUrl: "https://myorl.example.com",
      name: "MyORL",
      aggregateRating: { ratingValue: 4.8, reviewCount: 127 },
    });

    expect(ld.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.8,
      reviewCount: 127,
    });
  });
});
