import { describe, expect, it } from "vitest";

import { buildFaqPageLd } from "./faq";

describe("buildFaqPageLd", () => {
  it("generates a FAQPage schema with questions", () => {
    const ld = buildFaqPageLd([
      { question: "What is ORL?", answer: "Otolaryngology — ear, nose and throat medicine." },
      { question: "Where are you located?", answer: "Athens, Greece." },
    ]);

    expect(ld).not.toBeNull();
    expect(ld!["@context"]).toBe("https://schema.org");
    expect(ld!["@type"]).toBe("FAQPage");
    expect(ld!.mainEntity).toHaveLength(2);
  });

  it("maps each item to a Question / Answer pair", () => {
    const ld = buildFaqPageLd([{ question: "Q1", answer: "A1" }]);

    expect(ld).not.toBeNull();
    expect(ld!.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: "Q1",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A1",
      },
    });
  });

  it("returns null for empty items", () => {
    expect(buildFaqPageLd([])).toBeNull();
  });
});
