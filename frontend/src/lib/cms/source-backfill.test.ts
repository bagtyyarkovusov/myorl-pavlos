import { describe, expect, it } from "vitest";

import { backfillSources } from "./source-backfill";
import type { PageDTO } from "./types";

function makePage(
  overrides: Partial<Pick<PageDTO, "sources" | "parentPage" | "tags">> = {},
): Pick<PageDTO, "sources" | "parentPage" | "tags"> {
  return {
    sources: null,
    parentPage: null,
    tags: [],
    ...overrides,
  };
}

describe("backfillSources", () => {
  it("returns existing sources when page already has sources", () => {
    const page = makePage({ sources: "<p>Existing sources</p>" });
    const paired = makePage({ sources: "<p>Paired sources</p>" });
    expect(backfillSources(page, paired)).toBe("<p>Existing sources</p>");
  });

  it("returns null when page has no sources and no paired page is provided", () => {
    const page = makePage({ sources: null });
    expect(backfillSources(page, null)).toBeNull();
  });

  it("returns null when page has no sources and paired page has no sources", () => {
    const page = makePage({ sources: null });
    const paired = makePage({ sources: null });
    expect(backfillSources(page, paired)).toBeNull();
  });

  it("backfills sources from paired page when both share the same parent", () => {
    const page = makePage({
      sources: null,
      parentPage: { documentId: "hub-1", slug: "hub", title: "Hub" },
      tags: [],
    });
    const paired = makePage({
      sources: "<p>Paired sources</p>",
      parentPage: { documentId: "hub-1", slug: "hub", title: "Hub" },
      tags: [],
    });
    expect(backfillSources(page, paired)).toBe("<p>Paired sources</p>");
  });

  it("backfills sources from paired page when both share at least one tag", () => {
    const page = makePage({
      sources: null,
      parentPage: null,
      tags: [{ name: "Pediatric", slug: "pediatric" }],
    });
    const paired = makePage({
      sources: "<p>Paired sources</p>",
      parentPage: null,
      tags: [
        { name: "Pediatric", slug: "pediatric" },
        { name: "ENT", slug: "ent" },
      ],
    });
    expect(backfillSources(page, paired)).toBe("<p>Paired sources</p>");
  });

  it("returns null when pages do not share parent or tags", () => {
    const page = makePage({
      sources: null,
      parentPage: { documentId: "hub-1", slug: "hub-1", title: "Hub 1" },
      tags: [{ name: "Pediatric", slug: "pediatric" }],
    });
    const paired = makePage({
      sources: "<p>Paired sources</p>",
      parentPage: { documentId: "hub-2", slug: "hub-2", title: "Hub 2" },
      tags: [{ name: "ENT", slug: "ent" }],
    });
    expect(backfillSources(page, paired)).toBeNull();
  });

  it("returns null when page has no sources and paired page has no tags or parent match", () => {
    const page = makePage({ sources: null, parentPage: null, tags: [] });
    const paired = makePage({
      sources: "<p>Paired sources</p>",
      parentPage: null,
      tags: [],
    });
    expect(backfillSources(page, paired)).toBeNull();
  });
});
