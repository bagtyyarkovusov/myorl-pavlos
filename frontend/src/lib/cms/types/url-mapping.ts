import { z } from "zod";

export const URL_MAPPING_DESTINATION_KINDS = ["internal-301", "external-301", "gone-410"] as const;

export type UrlMappingDestinationKind = (typeof URL_MAPPING_DESTINATION_KINDS)[number];

const urlMappingAttributeSchema = z.object({
  legacyPath: z.string(),
  destinationPath: z.string(),
  destinationKind: z.enum(URL_MAPPING_DESTINATION_KINDS),
  locale: z.enum(["el", "ru"]).nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  documentId: z.string().optional(),
});

export type UrlMappingAttribute = z.infer<typeof urlMappingAttributeSchema>;

const urlMappingEntitySchema = z.object({
  id: z.number().optional(),
  documentId: z.string(),
  legacyPath: z.string(),
  destinationPath: z.string(),
  destinationKind: z.enum(URL_MAPPING_DESTINATION_KINDS),
  locale: z.enum(["el", "ru"]).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type UrlMappingEntity = z.infer<typeof urlMappingEntitySchema>;

export const urlMappingListResponseSchema = z.object({
  data: z.array(urlMappingEntitySchema).optional().default([]),
  meta: z
    .object({
      pagination: z
        .object({
          page: z.number().optional(),
          pageSize: z.number().optional(),
          pageCount: z.number().optional(),
          total: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type UrlMappingListResponse = z.infer<typeof urlMappingListResponseSchema>;
