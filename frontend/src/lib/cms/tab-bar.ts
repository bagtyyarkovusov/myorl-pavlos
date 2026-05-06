import type { NavigationNodeDTO, PageDTO } from "./types";

/**
 * Derives the tab-bar nodes for a given page.
 *
 * For folder pages returns the page itself plus its children. For leaf pages
 * returns the parent plus its siblings. Returns `null` when the page is a
 * section index (no tab bar needed).
 *
 * @param tree - Full navigation tree for the current locale.
 * @param page - The current page DTO.
 * @returns Tab-bar nodes, or `null` if no tab bar should be shown.
 */
export function getTabBarNodes(
  tree: NavigationNodeDTO[],
  page: PageDTO,
): NavigationNodeDTO[] | null {
  if (page.layoutVariant === "section-index") return null;

  if (page.isFolder) {
    const self = findNodeByDocumentId(tree, page.documentId);
    if (!self || self.children.length === 0) return null;
    return [self, ...self.children];
  }

  const parentDocId = page.parentPage?.documentId;
  if (!parentDocId) return null;

  const parent = findNodeByDocumentId(tree, parentDocId);
  if (!parent) return null;

  return [parent, ...parent.children];
}

function findNodeByDocumentId(
  nodes: NavigationNodeDTO[],
  documentId: string,
): NavigationNodeDTO | null {
  for (const node of nodes) {
    if (node.documentId === documentId) return node;
    const found = findNodeByDocumentId(node.children, documentId);
    if (found) return found;
  }
  return null;
}
