import { describe, expect, it, vi } from "vitest";
import type { Core } from "@strapi/strapi";

import { seedDesignSystemAudit } from "../seed-design-system-audit";

type ExistingPage = { documentId: string; slug: string; locale: string };

function createMockStrapi(opts: { existing?: ExistingPage[] } = {}): {
  strapi: Core.Strapi;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  log: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
} {
  const existing = opts.existing ?? [];
  const findMany = vi.fn(async ({ filters, locale }: { filters: { slug: string }; locale: string }) =>
    existing.filter((p) => p.slug === filters.slug && p.locale === locale),
  );
  const create = vi.fn(async ({ data, locale }: { data: { slug: string }; locale: string }) => ({
    documentId: `doc-${data.slug}-${locale}`,
    ...data,
    locale,
  }));

  const log = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const documents = vi.fn(() => ({
    findMany,
    create,
  }));

  const strapi = {
    log,
    documents,
  } as unknown as Core.Strapi;

  return { strapi, findMany, create, log };
}

describe("seedDesignSystemAudit", () => {
  it("creates the audit page in both supported locales on first run", async () => {
    const { strapi, create } = createMockStrapi();

    await seedDesignSystemAudit(strapi);

    expect(create).toHaveBeenCalledTimes(2);
    const locales = create.mock.calls.map((c) => c[0].locale).sort();
    expect(locales).toEqual(["el", "ru"]);
  });

  it("creates a page with one of every of the 10 section components", async () => {
    const { strapi, create } = createMockStrapi();

    await seedDesignSystemAudit(strapi);

    const elCall = create.mock.calls.find((c) => c[0].locale === "el");
    expect(elCall).toBeDefined();
    const sections = elCall![0].data.pageSections as Array<{ __component: string }>;
    const components = sections.map((s) => s.__component).sort();
    expect(components).toEqual(
      [
        "sections.accordion",
        "sections.advantages",
        "sections.contact",
        "sections.faq",
        "sections.gallery",
        "sections.linked-resources",
        "sections.promo-slider",
        "sections.social-links",
        "sections.tabs",
        "sections.video",
      ].sort(),
    );
  });

  it("is idempotent — does NOT create when the page already exists in a locale", async () => {
    const { strapi, create } = createMockStrapi({
      existing: [
        { documentId: "doc-1", slug: "design-system-audit", locale: "el" },
        { documentId: "doc-2", slug: "design-system-audit", locale: "ru" },
      ],
    });

    await seedDesignSystemAudit(strapi);

    expect(create).not.toHaveBeenCalled();
  });

  it("creates only the missing locales when one exists", async () => {
    const { strapi, create } = createMockStrapi({
      existing: [{ documentId: "doc-1", slug: "design-system-audit", locale: "el" }],
    });

    await seedDesignSystemAudit(strapi);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]![0].locale).toBe("ru");
  });

  it("does not throw when create fails for one locale (other locale still attempts)", async () => {
    const { strapi, create } = createMockStrapi();
    create.mockImplementationOnce(async () => {
      throw new Error("simulated db failure");
    });

    await expect(seedDesignSystemAudit(strapi)).resolves.toBeUndefined();
    // First call rejected, second still attempted.
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("seeds with seo.robotsNoindex and sitemapExclude set so the audit page is not indexed", async () => {
    const { strapi, create } = createMockStrapi();

    await seedDesignSystemAudit(strapi);

    for (const call of create.mock.calls) {
      const seo = call[0].data.seo as { robotsNoindex: boolean; sitemapExclude: boolean };
      expect(seo.robotsNoindex).toBe(true);
      expect(seo.sitemapExclude).toBe(true);
    }
  });

  it("hides the audit page from menu navigation by default", async () => {
    const { strapi, create } = createMockStrapi();

    await seedDesignSystemAudit(strapi);

    for (const call of create.mock.calls) {
      expect(call[0].data.hideFromMenu).toBe(true);
    }
  });
});
