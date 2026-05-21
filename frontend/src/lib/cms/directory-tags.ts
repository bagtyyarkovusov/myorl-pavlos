import type { NavigationNodeDTO } from "@/lib/cms/types";
import type { TagDTO } from "@/lib/cms/types/tag";

export const PRIMARY_DIRECTORY_TAG_LIMIT = 4;
export const SECTION_INDEX_FEATURED_COUNT = 3;

const SECTION_INDEX_DEPRIORITIZED_TAG_SLUGS = new Set(["procedures", "endoscopic-surgery"]);

const SECTION_INDEX_DEPRIORITIZED_TAG_PATTERNS = [
  /^epemvase/i,
  /endoskop.*cheiourg/i,
  /endoskop.*chirurg/i,
  /endoskop.*chiourg/i,
];

export function isDeprioritizedSectionIndexTag(tag: TagDTO): boolean {
  if (SECTION_INDEX_DEPRIORITIZED_TAG_SLUGS.has(tag.slug)) return true;
  return SECTION_INDEX_DEPRIORITIZED_TAG_PATTERNS.some((pattern) => pattern.test(tag.slug));
}

/**
 * Builds MODX-style directory tag filters from navigation children: ordered
 * unique tags (first appearance in menu order) plus a documentId → slug map.
 */
export function deriveDirectoryTagFilter(children: NavigationNodeDTO[]): {
  tags: TagDTO[];
  tagMap: Record<string, string[]>;
} {
  const sorted = [...children].sort(
    (a, b) =>
      a.menuIndex - b.menuIndex ||
      a.slug.localeCompare(b.slug) ||
      a.navLabel.localeCompare(b.navLabel),
  );

  const tagMap: Record<string, string[]> = {};
  const seenSlugs = new Set<string>();
  const tags: TagDTO[] = [];

  for (const child of sorted) {
    const childTags = child.tags ?? [];
    tagMap[child.documentId] = childTags.map((t) => t.slug);
    for (const tag of childTags) {
      if (seenSlugs.has(tag.slug)) continue;
      seenSlugs.add(tag.slug);
      tags.push(tag);
    }
  }

  return { tags, tagMap };
}

/**
 * Splits directory tags into a small primary row plus secondary disclosure.
 * On section-index hubs, procedure-category tags sink below anatomy filters.
 */
export function partitionDirectoryTags(
  tags: TagDTO[],
  context: "section-index" | "default" = "default",
): { primary: TagDTO[]; secondary: TagDTO[] } {
  const ordered =
    context === "section-index"
      ? [...tags].sort((a, b) => {
          const aRank = isDeprioritizedSectionIndexTag(a) ? 1 : 0;
          const bRank = isDeprioritizedSectionIndexTag(b) ? 1 : 0;
          return aRank - bRank;
        })
      : tags;

  return {
    primary: ordered.slice(0, PRIMARY_DIRECTORY_TAG_LIMIT),
    secondary: ordered.slice(PRIMARY_DIRECTORY_TAG_LIMIT),
  };
}
