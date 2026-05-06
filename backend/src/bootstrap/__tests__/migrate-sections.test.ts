import { describe, expect, it, vi } from "vitest";
import { migrateSections } from "../migrate-sections";
import type { Core } from "@strapi/strapi";

function createMockStrapi(overrides?: {
  markerValue?: unknown;
  pages?: Array<Record<string, unknown>>;
}): Core.Strapi {
  const store = {
    get: vi.fn().mockResolvedValue(overrides?.markerValue),
    set: vi.fn().mockResolvedValue(undefined),
  };

  const documents = {
    findMany: vi.fn().mockResolvedValue(overrides?.pages ?? []),
    update: vi.fn().mockResolvedValue(undefined),
  };

  return {
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    store: vi.fn(() => store),
    documents: vi.fn(() => documents),
  } as unknown as Core.Strapi;
}

describe("migrateSections", () => {
  it("is idempotent — skips when marker matches SEED_VERSION", async () => {
    const strapi = createMockStrapi({ markerValue: "v1" });

    await migrateSections(strapi);

    const store = strapi.store({ type: "plugin", name: "content-manager" });
    expect(store.get).toHaveBeenCalledWith({ key: "migrate_sections_version" });
    expect(strapi.documents("api::page.page").findMany).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });

  it("is empty-run safe — no pages yields zero migrations and still sets marker", async () => {
    const strapi = createMockStrapi({ markerValue: null, pages: [] });

    await migrateSections(strapi);

    const store = strapi.store({ type: "plugin", name: "content-manager" });
    expect(strapi.documents("api::page.page").findMany).toHaveBeenCalled();
    expect(store.set).toHaveBeenCalledWith({ key: "migrate_sections_version", value: "v1" });
  });

  it("migrates a dedicated field into pageSections when not already present", async () => {
    const pages = [
      {
        documentId: "page-1",
        title: "About",
        faqSection: { question: "Q1", answer: "A1" },
        pageSections: [],
      },
    ];
    const strapi = createMockStrapi({ markerValue: null, pages });

    await migrateSections(strapi);

    const updateCall = (strapi.documents("api::page.page").update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updateCall[0]).toMatchObject({
      documentId: "page-1",
      data: {
        pageSections: [{ __component: "sections.faq", question: "Q1", answer: "A1" }],
        faqSection: null,
      },
    });
  });

  it("skips pages that already have the section in pageSections", async () => {
    const pages = [
      {
        documentId: "page-1",
        title: "About",
        faqSection: { question: "Q1", answer: "A1" },
        pageSections: [{ __component: "sections.faq", question: "Q2", answer: "A2" }],
      },
    ];
    const strapi = createMockStrapi({ markerValue: null, pages });

    await migrateSections(strapi);

    expect(strapi.documents("api::page.page").update).not.toHaveBeenCalled();
  });
});
