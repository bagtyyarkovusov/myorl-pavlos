import type { NavigationNodeDTO, PageDTO } from "./types";

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
