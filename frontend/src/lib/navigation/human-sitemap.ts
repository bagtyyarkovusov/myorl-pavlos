import type { LayoutVariant, NavigationNodeDTO } from "@/lib/cms/types";

export const HUMAN_SITEMAP_EXCLUDED_LAYOUTS = new Set<LayoutVariant>([
  "not-found",
  "search-results",
  "sitemap",
  "appointment-form",
]);

export type FilterHumanSitemapTreeOptions = {
  excludeSlug?: string;
};

function isExcludedLayout(layoutVariant: LayoutVariant): boolean {
  return HUMAN_SITEMAP_EXCLUDED_LAYOUTS.has(layoutVariant);
}

function filterNode(
  node: NavigationNodeDTO,
  depth: number,
  options: FilterHumanSitemapTreeOptions,
): NavigationNodeDTO | null {
  if (options.excludeSlug && node.slug === options.excludeSlug) {
    return null;
  }

  if (isExcludedLayout(node.layoutVariant)) {
    return null;
  }

  if (depth === 0 && node.hideFromMenu) {
    return null;
  }

  const children = node.children
    .map((child) => filterNode(child, depth + 1, options))
    .filter((child): child is NavigationNodeDTO => child !== null);

  return { ...node, children };
}

/**
 * Prepares {@link NavigationNodeDTO} tree for the Human Site Map page.
 *
 * Uses directory navigation (includes menu-hidden section sub-pages), drops
 * system layouts, the current sitemap page, and hidden root orphans.
 */
export function filterHumanSitemapTree(
  nodes: NavigationNodeDTO[],
  options: FilterHumanSitemapTreeOptions = {},
): NavigationNodeDTO[] {
  return nodes
    .map((node) => filterNode(node, 0, options))
    .filter((node): node is NavigationNodeDTO => node !== null);
}
