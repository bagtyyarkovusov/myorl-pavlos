import type { Core } from "@strapi/strapi";

const SEED_VERSION = "v1";
const MARKER_KEY = "seed_global_version";

const LOCALES = ["el", "ru"] as const;

export async function seedGlobal(strapi: Core.Strapi): Promise<void> {
  const store = strapi.store({ type: "plugin", name: "content-manager" });

  const markerValue = await store.get({ key: MARKER_KEY });
  if (markerValue === SEED_VERSION) {
    return;
  }

  for (const locale of LOCALES) {
    try {
      const existing = await strapi.documents("api::global.global").findFirst({
        locale,
      });

      if (existing) {
        strapi.log.info(
          `[seed-global] Global entry (${locale}) already exists — skipping`,
        );
        continue;
      }

      await strapi.documents("api::global.global").create({
        locale,
        address: null,
        phoneTel: null,
        phoneDisplay: null,
        hours: null,
      });

      strapi.log.info(`[seed-global] Created Global entry (${locale})`);
    } catch (err) {
      strapi.log.error(`[seed-global] Failed to seed Global entry (${locale})`, err);
    }
  }

  await store.set({ key: MARKER_KEY, value: SEED_VERSION });
  strapi.log.info("[seed-global] Seed complete");
}
