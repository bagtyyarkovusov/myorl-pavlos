import type { LayoutVariant } from "@myorl-pavlos/shared-types";

import type { NavigationNodeDTO, PageDTO, PageRefDTO } from "./types";

export const RELATED_TOPICS_ARTICLE_LAYOUTS = new Set<LayoutVariant>([
  "encyclopedia-article",
  "specialized-article",
  "service-article",
  "standard",
]);

/** Layout variants that should never appear as Related Topic suggestions. */
const RELATED_TOPICS_EXCLUDED_LAYOUTS = new Set<LayoutVariant>([
  "section-hub",
  "section-index",
  "clinic-index",
  "encyclopedia-index",
]);

export const RELATED_TOPICS_MAX = 6;

type RelatedTopicsCandidate = Pick<
  NavigationNodeDTO,
  | "documentId"
  | "slug"
  | "title"
  | "locale"
  | "layoutVariant"
  | "hideFromMenu"
  | "menuIndex"
  | "tags"
  | "parentPage"
  | "featuredImage"
  | "imageCenter"
>;

function flattenNavigation(nodes: NavigationNodeDTO[]): NavigationNodeDTO[] {
  const flat: NavigationNodeDTO[] = [];
  const walk = (list: NavigationNodeDTO[]) => {
    for (const node of list) {
      flat.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return flat;
}

function isArticleLayout(layoutVariant: LayoutVariant): boolean {
  return RELATED_TOPICS_ARTICLE_LAYOUTS.has(layoutVariant);
}

function isEligibleCandidate(candidate: RelatedTopicsCandidate, page: PageDTO): boolean {
  if (candidate.documentId === page.documentId) return false;
  if (candidate.locale !== page.locale) return false;
  if (candidate.hideFromMenu) return false;
  if (!isArticleLayout(candidate.layoutVariant)) return false;
  if (RELATED_TOPICS_EXCLUDED_LAYOUTS.has(candidate.layoutVariant)) return false;
  if (!candidate.slug) return false;
  if (page.parentPage?.documentId && candidate.documentId === page.parentPage.documentId)
    return false;
  return true;
}

function sharedTagCount(page: PageDTO, candidate: RelatedTopicsCandidate): number {
  if (page.tags.length === 0 || candidate.tags.length === 0) return 0;
  const pageSlugs = new Set(page.tags.map((tag) => tag.slug));
  return candidate.tags.filter((tag) => pageSlugs.has(tag.slug)).length;
}

function compareCandidates(
  a: RelatedTopicsCandidate,
  b: RelatedTopicsCandidate,
  page: PageDTO,
): number {
  const tagDiff = sharedTagCount(page, b) - sharedTagCount(page, a);
  if (tagDiff !== 0) return tagDiff;
  const menuDiff = a.menuIndex - b.menuIndex;
  if (menuDiff !== 0) return menuDiff;
  return a.title.localeCompare(b.title, page.locale);
}

function toPageRef(candidate: RelatedTopicsCandidate): PageRefDTO {
  return {
    documentId: candidate.documentId,
    slug: candidate.slug,
    title: candidate.title,
    featuredImage: candidate.imageCenter ?? candidate.featuredImage ?? null,
  };
}

function dedupeByDocumentId(candidates: RelatedTopicsCandidate[]): RelatedTopicsCandidate[] {
  const seen = new Set<string>();
  const out: RelatedTopicsCandidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.documentId)) continue;
    seen.add(candidate.documentId);
    out.push(candidate);
  }
  return out;
}

/**
 * Resolves Related Topics for a page per ADR-010.
 *
 * Uses editor `relatedPages` when present; otherwise auto-suggests from shared
 * tags and sibling articles in `directoryNavigation`.
 */
export function resolveRelatedTopics(
  page: PageDTO,
  directoryNavigation: NavigationNodeDTO[],
): PageRefDTO[] {
  if (!isArticleLayout(page.layoutVariant)) {
    return [];
  }

  if (page.relatedPages.length > 0) {
    return page.relatedPages.slice(0, RELATED_TOPICS_MAX);
  }

  const flat = flattenNavigation(directoryNavigation);
  const eligible = flat.filter((candidate) => isEligibleCandidate(candidate, page));

  const parentId = page.parentPage?.documentId;
  const tagMatches = eligible
    .filter((candidate) => sharedTagCount(page, candidate) > 0)
    .sort((a, b) => compareCandidates(a, b, page));

  const siblings = parentId
    ? eligible
        .filter((candidate) => candidate.parentPage?.documentId === parentId)
        .sort((a, b) => compareCandidates(a, b, page))
    : [];

  const merged = dedupeByDocumentId([...tagMatches, ...siblings]);
  return merged.slice(0, RELATED_TOPICS_MAX).map(toPageRef);
}

/**
 * Attaches resolved Related Topics to a page DTO at the request boundary.
 */
export function withRelatedTopics(
  page: PageDTO,
  directoryNavigation: NavigationNodeDTO[],
): PageDTO {
  return {
    ...page,
    relatedTopics: resolveRelatedTopics(page, directoryNavigation),
  };
}
