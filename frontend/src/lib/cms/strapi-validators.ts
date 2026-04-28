import { z } from "zod";

const optionalStringTransform = z
  .string()
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const strapiGlobalEntitySchema = z
  .object({
    id: z.number().optional(),
    documentId: z.string(),
    locale: z.string(),
    address: optionalStringTransform,
    phoneTel: optionalStringTransform,
    phoneDisplay: optionalStringTransform,
    hours: optionalStringTransform,
  })
  .passthrough();

export const globalResponseSchema = z
  .object({
    data: strapiGlobalEntitySchema.nullable(),
    meta: z.unknown().optional(),
  })
  .transform((response) => {
    if (!response.data) return null;
    return {
      locale: (response.data.locale === "el" || response.data.locale === "ru"
        ? response.data.locale
        : "el") as "el" | "ru",
      address: response.data.address,
      phoneTel: response.data.phoneTel,
      phoneDisplay: response.data.phoneDisplay,
      hours: response.data.hours,
    };
  });
