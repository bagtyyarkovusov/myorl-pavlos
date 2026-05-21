import { describe, expect, it } from "vitest";

import { resolveVideoEntryArticleHref, toVideoEntryDTO } from "./video-entry-normalizer";
import type { StrapiVideoEntryPayload } from "./types";

describe("toVideoEntryDTO", () => {
  it("normalizes categories from string arrays", () => {
    const dto = toVideoEntryDTO({
      documentId: "vid-1",
      locale: "el",
      title: "Test video",
      youtubeId: "abc123",
      categories: ["Ρινός", "Παιδο-ΩΡΛ"],
      sortOrder: 3,
    } as StrapiVideoEntryPayload);

    expect(dto.categories).toEqual([
      { slug: "ρινος", label: "Ρινός" },
      { slug: "παιδο-ωρλ", label: "Παιδο-ΩΡΛ" },
    ]);
    expect(dto.sortOrder).toBe(3);
  });
});

describe("resolveVideoEntryArticleHref", () => {
  it("prefers related article slug over legacy URL", () => {
    const href = resolveVideoEntryArticleHref({
      locale: "el",
      relatedArticle: { documentId: "p1", slug: "igmoritida", title: "Γαμορίτιδα" },
      legacyArticleUrl: "http://myorl.gr/old-slug",
    });

    expect(href).toBe("/el/igmoritida");
  });

  it("maps legacy myorl.gr paths to locale-prefixed routes", () => {
    const href = resolveVideoEntryArticleHref({
      locale: "ru",
      relatedArticle: null,
      legacyArticleUrl: "https://myorl.gr/roxalito-ypniki-apnoia",
    });

    expect(href).toBe("/ru/roxalito-ypniki-apnoia");
  });

  it("suppresses broken hash-only legacy links", () => {
    const href = resolveVideoEntryArticleHref({
      locale: "el",
      relatedArticle: null,
      legacyArticleUrl: "http://myorl.gr/#",
    });

    expect(href).toBeNull();
  });
});
