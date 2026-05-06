import "server-only";

import { z } from "zod";

const DEFAULT_SITE_URL = "http://localhost:3000";

const optionalString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .transform((value) => (value ? value : undefined));

const cmsConfigSchema = z.object({
  strapiUrl: z.string().url(),
  strapiToken: optionalString,
  siteUrl: z.string().url(),
  revalidateSecret: optionalString,
});

/**
 * Validated CMS environment configuration.
 *
 * @see {@link getCmsConfig}
 */
export type CmsConfig = z.infer<typeof cmsConfigSchema>;

let cached: CmsConfig | null = null;

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Reads and validates CMS environment variables.
 *
 * Caches the result so subsequent calls are free. Throws a descriptive error
 * if any required variable is missing or malformed.
 *
 * @returns The validated {@link CmsConfig}.
 * @throws When environment configuration is invalid.
 */
export function getCmsConfig(): CmsConfig {
  if (cached) {
    return cached;
  }

  const parsed = cmsConfigSchema.safeParse({
    strapiUrl: normalizeOrigin(process.env.STRAPI_URL || ""),
    strapiToken: process.env.STRAPI_TOKEN,
    siteUrl: normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL),
    revalidateSecret: process.env.STRAPI_REVALIDATE_SECRET,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid CMS environment configuration:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}
