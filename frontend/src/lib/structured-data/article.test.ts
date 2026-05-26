import { describe, expect, it } from "vitest";

import { buildArticleLd } from "./article";

describe("buildArticleLd", () => {
  it("generates an Article schema with required fields", () => {
    const ld = buildArticleLd({
      title: "Νέες εξελίξεις στην ΩΡΛ χειρουργική",
      pageUrl: "https://myorl.example.com/el/nees-exelixeis",
      locale: "el",
    });

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Article");
    expect(ld.headline).toBe("Νέες εξελίξεις στην ΩΡΛ χειρουργική");
    expect(ld.url).toBe("https://myorl.example.com/el/nees-exelixeis");
    expect(ld.inLanguage).toBe("el");
  });

  it("includes description when provided", () => {
    const ld = buildArticleLd({
      title: "Νέες εξελίξεις στην ΩΡΛ χειρουργική",
      pageUrl: "https://myorl.example.com/el/nees-exelixeis",
      description: "Άρθρο για τις τελευταίες εξελίξεις στη χειρουργική ΩΡΛ",
      locale: "el",
    });

    expect(ld.description).toBe("Άρθρο για τις τελευταίες εξελίξεις στη χειρουργική ΩΡΛ");
  });

  it("omits description when not provided", () => {
    const ld = buildArticleLd({
      title: "Νέες εξελίξεις στην ΩΡΛ χειρουργική",
      pageUrl: "https://myorl.example.com/el/nees-exelixeis",
      locale: "el",
    });

    expect(ld).not.toHaveProperty("description");
  });

  it("does not include Phase 2 fields", () => {
    const ld = buildArticleLd({
      title: "Νέες εξελίξεις στην ΩΡΛ χειρουργική",
      pageUrl: "https://myorl.example.com/el/nees-exelixeis",
      locale: "el",
    });

    expect(ld).not.toHaveProperty("author");
    expect(ld).not.toHaveProperty("datePublished");
    expect(ld).not.toHaveProperty("dateModified");
  });

  it("does not have a name field — uses headline per Article schema", () => {
    const ld = buildArticleLd({
      title: "Test",
      pageUrl: "https://myorl.example.com/el/test",
      locale: "el",
    });

    expect(ld).not.toHaveProperty("name");
    expect(ld.headline).toBe("Test");
  });
});
