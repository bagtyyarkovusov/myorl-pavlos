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
    ).toEqual(["pages", "sitemap", "navigation:ru", "locale:ru", "page:ru:index", "page:doc-1"]);
  });

  it("maps Strapi tag payloads to taxonomy and page caches", () => {
    expect(
      deriveTags({
        event: "entry.update",
        model: "api::tag.tag",
        entry: { locale: "el", slug: "ear" },
      }),
    ).toEqual(["tags", "pages", "sitemap", "locale:el"]);
  });

  it("maps Strapi video-entry payloads to page and locale caches", () => {
    expect(
      deriveTags({
        event: "entry.publish",
        model: "api::video-entry.video-entry",
        entry: { locale: "ru", documentId: "vid-1" },
      }),
    ).toEqual(["pages", "sitemap", "locale:ru", "video:vid-1"]);
  });

  it("maps Strapi global payloads to global, page, and locale caches", () => {
    expect(
      deriveTags({
        event: "entry.update",
        model: "api::global.global",
        entry: { locale: "el" },
      }),
    ).toEqual(["pages", "sitemap", "global:el", "locale:el"]);
  });

  it("passes through explicit tags arrays including documentId and locale patterns", () => {
    expect(
      deriveTags({
        tags: ["page-doc123", "locale-el"],
      }),
    ).toEqual(["page-doc123", "locale-el"]);
  });

  it("maps media payloads broadly because pages may reference media", () => {
    expect(deriveTags({ event: "media.update", media: { id: 1 } })).toEqual(["pages", "sitemap"]);
  });

  it("maps Strapi url-mapping payloads to url-mappings tag", () => {
    expect(
      deriveTags({
        event: "entry.create",
        model: "api::url-mapping.url-mapping",
        entry: {
          legacyPath: "/old-slug",
          destinationPath: "/el/new-slug",
          destinationKind: "internal-301",
        },
      }),
    ).toEqual(["url-mappings"]);
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
