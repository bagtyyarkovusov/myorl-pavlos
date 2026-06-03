import type { PageDTO } from "./types";

/**
 * Attempts to backfill missing sources from a paired locale article.
 *
 * Sources are backfilled only when:
 * - The target page has no sources (null or empty)
 * - The paired page has sources
 * - Both pages cover the same medical topic (shared parent or tags)
 */
export function backfillSources(
  page: Pick<PageDTO, "sources" | "parentPage" | "tags">,
  pairedPage?: Pick<PageDTO, "sources" | "parentPage" | "tags"> | null,
): string | null {
  if (page.sources) return page.sources;
  if (!pairedPage?.sources) return page.sources ?? null;
  if (!isSameMedicalTopic(page, pairedPage)) return page.sources ?? null;
  return pairedPage.sources;
}

function isSameMedicalTopic(
  a: Pick<PageDTO, "parentPage" | "tags">,
  b: Pick<PageDTO, "parentPage" | "tags">,
): boolean {
  if (
    a.parentPage?.documentId &&
    b.parentPage?.documentId &&
    a.parentPage.documentId === b.parentPage.documentId
  ) {
    return true;
  }
  const aTags = new Set(a.tags.map((t) => t.slug));
  return b.tags.some((t) => aTags.has(t.slug));
}
