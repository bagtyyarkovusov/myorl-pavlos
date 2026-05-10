import { describe, expect, it, vi } from "vitest";
import { seedGlobal } from "../seed-global";
import type { Core } from "@strapi/strapi";

function createMockStrapi(overrides?: {
  markerValue?: unknown;
  findFirstResults?: Array<Record<string, unknown> | null>;
}): Core.Strapi {
  const store = {
    get: vi.fn().mockResolvedValue(overrides?.markerValue),
    set: vi.fn().mockResolvedValue(undefined),
  };

  const results = overrides?.findFirstResults ?? [null, null];
  let callIndex = 0;

  const documents = {
    findFirst: vi.fn().mockImplementation(() => {
      const result = results[callIndex];
      callIndex++;
      return Promise.resolve(result);
    }),
    create: vi.fn().mockResolvedValue(undefined),
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

describe("seedGlobal", () => {
  it("is idempotent — skips when marker matches SEED_VERSION", async () => {
    const strapi = createMockStrapi({ markerValue: "v1" });

    await seedGlobal(strapi);

    const store = strapi.store({ type: "plugin", name: "content-manager" });
    expect(store.get).toHaveBeenCalledWith({ key: "seed_global_version" });
    expect(strapi.documents("api::global.global").findFirst).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });

  it("creates entries for both locales when none exist", async () => {
    const strapi = createMockStrapi({
      markerValue: null,
      findFirstResults: [null, null],
    });

    await seedGlobal(strapi);

    const docs = strapi.documents("api::global.global");
    expect(docs.findFirst).toHaveBeenCalledTimes(2);
    expect(docs.create).toHaveBeenCalledTimes(2);

    expect(docs.create).toHaveBeenCalledWith({
      locale: "el",
      address: null,
      phoneTel: null,
      phoneDisplay: null,
      hours: null,
    });

    expect(docs.create).toHaveBeenCalledWith({
      locale: "ru",
      address: null,
      phoneTel: null,
      phoneDisplay: null,
      hours: null,
    });

    const store = strapi.store({ type: "plugin", name: "content-manager" });
    expect(store.set).toHaveBeenCalledWith({
      key: "seed_global_version",
      value: "v1",
    });
  });

  it("skips locales that already have entries", async () => {
    const strapi = createMockStrapi({
      markerValue: null,
      findFirstResults: [{ id: 1, locale: "el" }, null],
    });

    await seedGlobal(strapi);

    const docs = strapi.documents("api::global.global");
    expect(docs.findFirst).toHaveBeenCalledTimes(2);
    expect(docs.create).toHaveBeenCalledTimes(1);

    expect(docs.create).toHaveBeenCalledWith({
      locale: "ru",
      address: null,
      phoneTel: null,
      phoneDisplay: null,
      hours: null,
    });
  });

  it("skips all locales when both already exist", async () => {
    const strapi = createMockStrapi({
      markerValue: null,
      findFirstResults: [{ id: 1, locale: "el" }, { id: 2, locale: "ru" }],
    });

    await seedGlobal(strapi);

    const docs = strapi.documents("api::global.global");
    expect(docs.findFirst).toHaveBeenCalledTimes(2);
    expect(docs.create).not.toHaveBeenCalled();

    const store = strapi.store({ type: "plugin", name: "content-manager" });
    expect(store.set).toHaveBeenCalledWith({
      key: "seed_global_version",
      value: "v1",
    });
  });
});
