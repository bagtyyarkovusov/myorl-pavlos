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
    create: vi.fn().mockResolvedValue({ documentId: "mock-doc-id" }),
    update: vi.fn().mockResolvedValue({ documentId: "mock-doc-id" }),
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
    const strapi = createMockStrapi({ markerValue: "v6" });

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

    expect(docs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "el",
        data: expect.objectContaining({
          address: "Λεωφόρος Αλεξάνδρας 201 & Πανόρμου, Αμπελόκηποι, Αθήνα",
          disclaimerText:
            "Οι πληροφορίες σε αυτό το άρθρο έχουν εκπαιδευτικό χαρακτήρα και δεν αντικαθιστούν την εξατομικευμένη ιατρική γνωμάτευση. Συμβουλευθείτε γιατρό για διάγνωση και θεραπεία.",
        }),
      }),
    );

    expect(docs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "ru",
        data: expect.objectContaining({
          address: "Проспект Alexandras 201 & Panormou, Амбелокипи, Афины",
          disclaimerText:
            "Информация в этой статье носит образовательный характер и не заменяет индивидуальную медицинскую консультацию. Обратитесь к врачу для диагностики и лечения.",
        }),
      }),
    );

    const store = strapi.store({ type: "plugin", name: "content-manager" });
    expect(store.set).toHaveBeenCalledWith({
      key: "seed_global_version",
      value: "v6",
    });
  });

  it("updates existing entries and creates missing ones", async () => {
    const existingEl = { documentId: "existing-el", locale: "el" };
    const strapi = createMockStrapi({
      markerValue: null,
      findFirstResults: [existingEl, null],
    });

    await seedGlobal(strapi);

    const docs = strapi.documents("api::global.global");
    expect(docs.findFirst).toHaveBeenCalledTimes(2);
    expect(docs.update).toHaveBeenCalledTimes(1);
    expect(docs.create).toHaveBeenCalledTimes(1);

    expect(docs.create).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "ru" }),
    );
  });

  it("skips all locales when both already exist", async () => {
    const strapi = createMockStrapi({
      markerValue: null,
      findFirstResults: [
        { documentId: "existing-el", locale: "el" },
        { documentId: "existing-ru", locale: "ru" },
      ],
    });

    await seedGlobal(strapi);

    const docs = strapi.documents("api::global.global");
    expect(docs.findFirst).toHaveBeenCalledTimes(2);
    expect(docs.create).not.toHaveBeenCalled();

    const store = strapi.store({ type: "plugin", name: "content-manager" });
    expect(store.set).toHaveBeenCalledWith({
      key: "seed_global_version",
      value: "v6",
    });
  });
});
