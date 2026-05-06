/**
 * Page response parsers that bridge Strapi validation schemas with DTO
 * transformation.
 *
 * These schemas are consumed by {@link createCmsGateway} to turn raw Strapi
 * responses into typed {@link PageDTO} objects. Keeping them in a dedicated
 * module decouples the gateway from the normaliser implementation details.
 */

import { z } from "zod";
import { toPageDTO } from "./page-normalizer";
import type { PageDTO, StrapiPagePayload } from "./types";
import {
  zodPageEntity,
  pageResponseSchema as rawPageResponseSchema,
  pageListResponseSchema as rawPageListResponseSchema,
} from "./strapi-validators";

export { zodPageEntity } from "./strapi-validators";

/**
 * Validates a single raw Strapi page entity and transforms it into a
 * {@link PageDTO}. Used by {@link createCmsGateway} for bulk fetches.
 */
export const pageEntitySchema = zodPageEntity.transform((raw) => {
  return toPageDTO(raw as StrapiPagePayload);
});

/**
 * Parses a single-page Strapi response ( `{ data: [...] }` ) and returns a
 * {@link PageDTO} or `null` when the array is empty.
 */
export const pageResponseSchema = rawPageResponseSchema.transform((raw) => {
  if (!raw) return null;
  return toPageDTO(raw as StrapiPagePayload);
});

/**
 * Parses a list-page Strapi response ( `{ data: [...] }` ) and returns an
 * array of {@link PageDTO} objects.
 */
export const pageListSchema = rawPageListResponseSchema.transform((raws) => {
  return raws.map((raw) => toPageDTO(raw as StrapiPagePayload));
});
