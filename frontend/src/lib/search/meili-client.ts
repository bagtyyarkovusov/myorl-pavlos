import "server-only";

import { Meilisearch } from "meilisearch";

import type { Locale } from "@/lib/cms/types";

type MeiliClient = InstanceType<typeof Meilisearch>;

let adminClient: MeiliClient | null | undefined;
let searchClient: MeiliClient | null | undefined;

export function indexNameForLocale(locale: Locale): "el" | "ru" {
  return locale;
}

export function isSearchEnabled(): boolean {
  return process.env.SEARCH_ENABLED !== "false";
}

export function getMeiliAdminClient(): MeiliClient | null {
  if (adminClient !== undefined) {
    return adminClient;
  }

  adminClient = createClient(process.env.MEILI_MASTER_KEY);
  return adminClient;
}

export function getMeiliSearchClient(): MeiliClient | null {
  if (searchClient !== undefined) {
    return searchClient;
  }

  searchClient = createClient(process.env.NEXT_PUBLIC_MEILI_SEARCH_KEY);
  return searchClient;
}

function createClient(apiKey: string | undefined): MeiliClient | null {
  // SEARCH_ENABLED gates the Search Index without changing deployed code.
  // MEILI_HOST points at the Meilisearch service, for example http://localhost:57700 in dev.
  // MEILI_MASTER_KEY is server-only and may only be used behind the `server-only` import above.
  // NEXT_PUBLIC_MEILI_SEARCH_KEY is the scoped search-only key used by search clients.
  if (!isSearchEnabled() || !process.env.MEILI_HOST || !apiKey) {
    return null;
  }

  try {
    return new Meilisearch({
      host: process.env.MEILI_HOST,
      apiKey,
      timeout: 2000,
    });
  } catch {
    return null;
  }
}
