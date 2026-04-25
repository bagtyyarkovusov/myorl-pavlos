import "server-only";

const DEFAULT_STRAPI_URL = "http://localhost:1337";
const DEFAULT_SITE_URL = "http://localhost:3000";

export type CmsConfig = {
  strapiUrl: string;
  strapiToken?: string;
  siteUrl: string;
  revalidateSecret?: string;
};

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getCmsConfig(): CmsConfig {
  return {
    strapiUrl: normalizeOrigin(process.env.STRAPI_URL || DEFAULT_STRAPI_URL),
    strapiToken: process.env.STRAPI_TOKEN?.trim() || undefined,
    siteUrl: normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL),
    revalidateSecret: process.env.STRAPI_REVALIDATE_SECRET?.trim() || undefined,
  };
}
