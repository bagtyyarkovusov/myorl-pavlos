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
  it("returns a locale-prefixed path when relatedArticle is resolved", () => {
    const href = resolveVideoEntryArticleHref({
      locale: "el",
      relatedArticle: { documentId: "p1", slug: "igmoritida", title: "Γαμορίτιδα" },
    });

    expect(href).toBe("/el/igmoritida");
  });

  it("returns null when relatedArticle is missing", () => {
    const href = resolveVideoEntryArticleHref({
      locale: "ru",
      relatedArticle: null,
    });

    expect(href).toBeNull();
  });

  it("returns null when relatedArticle has no slug", () => {
    const href = resolveVideoEntryArticleHref({
      locale: "el",
      relatedArticle: { documentId: "p1", slug: null, title: "Untitled" },
    });

    expect(href).toBeNull();
  });
});
