import type { Core } from "@strapi/strapi";

import {
  SEED_DISCLAIMER,
  SEED_PRIMARY_CONTACT,
  SEED_SOCIAL_LINKS,
  type SeedLocale,
} from "./seed-global-data";

const SEED_VERSION = "v8";
const MARKER_KEY = "seed_global_version";

const LOCALES: SeedLocale[] = ["el", "ru"];

export async function seedGlobal(strapi: Core.Strapi): Promise<void> {
  const store = strapi.store({ type: "plugin", name: "content-manager" });

  const markerValue = await store.get({ key: MARKER_KEY });
  if (markerValue === SEED_VERSION) {
    return;
  }

  let documentId: string | undefined;

  for (const locale of LOCALES) {
    try {
      const existing = await strapi.documents("api::global.global").findFirst({
        locale,
      });

      // Strapi 5's generated `Data.Input<TSchemaUID>` is structurally strict
      // (especially for component fields like socialLinks); the runtime
      // shape matches the schema, but TS can't prove the overlap. Cast at
      // the use site keeps the rest of the function strictly typed.
      const payload = {
        ...SEED_PRIMARY_CONTACT[locale],
        ...SEED_DISCLAIMER[locale],
        socialLinks: SEED_SOCIAL_LINKS,
      } as unknown as Parameters<
        ReturnType<Core.Strapi["documents"]>["create"]
      >[0]["data"];

      if (existing) {
        documentId = existing.documentId;
        await strapi.documents("api::global.global").update({
          documentId: existing.documentId,
          locale,
          data: payload,
        });
        strapi.log.info(`[seed-global] Updated Global entry (${locale})`);
        continue;
      }

      const created = await strapi.documents("api::global.global").create({
        locale,
        data: payload,
      });
      documentId = created.documentId;
      strapi.log.info(`[seed-global] Created Global entry (${locale})`);
    } catch (err) {
      strapi.log.error(`[seed-global] Failed to seed Global entry (${locale})`, err);
    }
  }

  if (documentId) {
    strapi.log.info(`[seed-global] Global documentId: ${documentId}`);
  }

  await store.set({ key: MARKER_KEY, value: SEED_VERSION });
  strapi.log.info("[seed-global] Seed complete");
}
