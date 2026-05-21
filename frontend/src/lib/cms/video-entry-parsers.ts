import { z } from "zod";
import { toVideoEntryDTO } from "./video-entry-normalizer";
import type { VideoEntryDTO, StrapiVideoEntryPayload } from "./types";
import { zodVideoEntryEntity } from "./strapi-validators";

export { zodVideoEntryEntity } from "./strapi-validators";

export const videoEntryEntitySchema = zodVideoEntryEntity.transform((raw) => {
  return toVideoEntryDTO(raw as StrapiVideoEntryPayload);
});

export const videoEntryListSchema = z.array(videoEntryEntitySchema);

export type { VideoEntryDTO };
