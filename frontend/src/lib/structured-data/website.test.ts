import { describe, expect, it } from "vitest";

import { buildWebSiteLd } from "./website";

describe("buildWebSiteLd", () => {
  it("generates a WebSite schema with SearchAction", () => {
    const ld = buildWebSiteLd("https://myorl.example.com", "MyORL");

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.name).toBe("MyORL");
    expect(ld.url).toBe("https://myorl.example.com");
  });

  it("includes a SearchAction potentialAction", () => {
    const ld = buildWebSiteLd("https://myorl.example.com", "MyORL");

    expect(ld.potentialAction).toBeDefined();
    expect(ld.potentialAction?.["@type"]).toBe("SearchAction");
    expect(ld.potentialAction?.target).toMatchObject({
      "@type": "EntryPoint",
      urlTemplate: "https://myorl.example.com/search-results?q={search_term_string}",
    });
    expect(ld.potentialAction?.["query-input"]).toBe("required name=search_term_string");
  });
});
