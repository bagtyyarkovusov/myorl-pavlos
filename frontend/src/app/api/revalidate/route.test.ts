import { describe, expect, it } from "vitest";

import { deriveTags, readBearerSecret, resolveProvidedSecret } from "./route";

describe("revalidation tag derivation", () => {
  it("keeps custom page payload compatibility", () => {
    expect(
      deriveTags({
        type: "page",
        locale: "el",
        slug: "epikoinonia",
        documentId: "doc-1",
      }),
    ).toEqual(["pages", "page:el:epikoinonia", "navigation:el", "page:doc-1", "sitemap"]);
  });

  it("maps Strapi page publish payloads to page, navigation, and sitemap tags", () => {
    expect(
      deriveTags({
        event: "entry.publish",
        model: "api::page.page",
        entry: {
          documentId: "doc-1",
          locale: "ru",
          slug: "index",
        },
      }),
    ).toEqual(["pages", "sitemap", "navigation:ru", "page:ru:index", "page:doc-1"]);
  });

  it("maps Strapi tag payloads to taxonomy and page caches", () => {
    expect(
      deriveTags({
        event: "entry.update",
        model: "api::tag.tag",
        entry: { locale: "el", slug: "ear" },
      }),
    ).toEqual(["tags", "pages", "sitemap"]);
  });

  it("maps media payloads broadly because pages may reference media", () => {
    expect(deriveTags({ event: "media.update", media: { id: 1 } })).toEqual(["pages", "sitemap"]);
  });
});

describe("revalidation auth helpers", () => {
  it("accepts bearer tokens for Strapi webhooks", () => {
    expect(readBearerSecret("Bearer test-secret")).toBe("test-secret");
    expect(resolveProvidedSecret({}, null, "Bearer test-secret")).toBe("test-secret");
  });

  it("prefers query/body secret compatibility over bearer auth", () => {
    expect(resolveProvidedSecret({ secret: "body-secret" }, null, "Bearer bearer-secret")).toBe(
      "body-secret",
    );
    expect(resolveProvidedSecret({}, "query-secret", "Bearer bearer-secret")).toBe("query-secret");
  });

  it("rejects malformed authorization headers by returning no secret", () => {
    expect(readBearerSecret("Basic test-secret")).toBeUndefined();
    expect(resolveProvidedSecret({}, null, "Basic test-secret")).toBeUndefined();
  });
});
