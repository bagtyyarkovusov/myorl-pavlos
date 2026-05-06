import { describe, expect, it } from "vitest";

import { buildBreadcrumbLd } from "./breadcrumb";

describe("buildBreadcrumbLd", () => {
  it("generates a BreadcrumbList schema", () => {
    const ld = buildBreadcrumbLd([
      { name: "Home", url: "https://myorl.example.com/el" },
      { name: "Services", url: "https://myorl.example.com/el/yperesies" },
    ]);

    expect(ld).not.toBeNull();
    expect(ld!["@context"]).toBe("https://schema.org");
    expect(ld!["@type"]).toBe("BreadcrumbList");
    expect(ld!.itemListElement).toHaveLength(2);
  });

  it("assigns sequential position numbers", () => {
    const ld = buildBreadcrumbLd([
      { name: "Home", url: "https://myorl.example.com/el" },
      { name: "About", url: "https://myorl.example.com/el/about" },
    ]);

    expect(ld).not.toBeNull();
    expect(ld!.itemListElement[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://myorl.example.com/el",
    });
    expect(ld!.itemListElement[1]).toMatchObject({
      "@type": "ListItem",
      position: 2,
      name: "About",
      item: "https://myorl.example.com/el/about",
    });
  });

  it("returns null for empty items", () => {
    expect(buildBreadcrumbLd([])).toBeNull();
  });
});
