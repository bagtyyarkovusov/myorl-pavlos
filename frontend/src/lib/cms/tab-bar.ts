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
    if (self.children.length <= 1) return null;
    return [self, ...self.children];
  }

  const parentDocId = page.parentPage?.documentId;
  if (!parentDocId) return null;

  const parent = findNodeByDocumentId(tree, parentDocId);
  if (!parent) return null;
  if (!parent.isFolder) return null;
  if (parent.children.length <= 1) return null;

  // Section-hub children: just siblings, no parent tab.
  if (parent.layoutVariant === "section-hub") return parent.children;

  return [parent, ...parent.children];
}

/** Maximum number of visible tabs before overflowing into a "More" dropdown. */
export const MAX_VISIBLE_TABS = 6;

export type TabBarConfig = {
  /** Tabs rendered directly in the nav bar (at most MAX_VISIBLE_TABS). */
  visible: NavigationNodeDTO[];
  /** Remaining tabs hidden behind the "More +N" dropdown. */
  overflow: NavigationNodeDTO[];
  /** Index of the active page within the combined [visible, ...overflow] set, or -1. */
  activeIndex: number;
  /** Whether the page is a leaf under a parent (show back-link). */
  isLeaf: boolean;
};

/**
 * Derives a paginated tab-bar configuration with visible and overflow sets.
 *
 * For leaf pages the parent is excluded from tabs (the back-link handles
 * parent navigation). The active page is guaranteed to be in the visible set.
 *
 * For folder pages the first tab is the folder itself, followed by children.
 *
 * @param tree - Full navigation tree for the current locale.
 * @param page - The current page DTO.
 * @param maxVisible - Max visible tabs (defaults to MAX_VISIBLE_TABS).
 */
export function getTabBarConfig(
  tree: NavigationNodeDTO[],
  page: PageDTO,
  maxVisible: number = MAX_VISIBLE_TABS,
): TabBarConfig | null {
  const allNodes = getTabBarNodes(tree, page);
  if (!allNodes || allNodes.length === 0) return null;

  if (page.isFolder) {
    const visible = allNodes.slice(0, maxVisible);
    const overflow = allNodes.slice(maxVisible);
    const activeIdx = allNodes.findIndex((n) => n.documentId === page.documentId);
    return { visible, overflow, activeIndex: activeIdx, isLeaf: false };
  }

  // Leaf page under a section-hub folder: allNodes are already just siblings.
  // Treat like a folder (no back-link, no parent exclusion), but promote
  // the active page into the visible window so it is never hidden.
  if (!page.isFolder && page.parentPage?.documentId) {
    const parentNode = findNodeByDocumentId(tree, page.parentPage.documentId);
    if (parentNode?.layoutVariant === "section-hub") {
      const activeIdx = allNodes.findIndex((n) => n.documentId === page.documentId);
      let visible: typeof allNodes;
      let overflow: typeof allNodes;
      if (allNodes.length <= maxVisible || activeIdx < maxVisible) {
        visible = allNodes.slice(0, maxVisible);
        overflow = allNodes.slice(maxVisible);
      } else {
        const promoted = activeIdx >= 0 ? allNodes[activeIdx] : undefined;
        if (!promoted) {
          visible = allNodes.slice(0, maxVisible);
          overflow = allNodes.slice(maxVisible);
        } else {
          visible = [...allNodes.slice(0, maxVisible - 1), promoted];
          overflow = [
            ...allNodes.slice(maxVisible - 1, activeIdx),
            ...allNodes.slice(activeIdx + 1),
          ];
        }
      }
      return { visible, overflow, activeIndex: activeIdx, isLeaf: false };
    }
  }

  // Leaf page: allNodes = [parent, ...siblings]. Exclude parent from tabs.
  const siblings = allNodes.slice(1);
  const activeIdx = siblings.findIndex((n) => n.documentId === page.documentId);

  // Ensure the active page is in the visible set.
  let visible: typeof siblings;
  let overflow: typeof siblings;
  if (siblings.length <= maxVisible) {
    visible = siblings;
    overflow = [];
  } else if (activeIdx < maxVisible) {
    visible = siblings.slice(0, maxVisible);
    overflow = siblings.slice(maxVisible);
  } else {
    const promoted = activeIdx >= 0 ? siblings[activeIdx] : undefined;
    if (!promoted) {
      visible = siblings.slice(0, maxVisible);
      overflow = siblings.slice(maxVisible);
    } else {
      visible = [...siblings.slice(0, maxVisible - 1), promoted];
      overflow = [...siblings.slice(maxVisible - 1, activeIdx), ...siblings.slice(activeIdx + 1)];
    }
  }

  return { visible, overflow, activeIndex: activeIdx, isLeaf: true };
}

/**
 * Returns true when `page` is a leaf whose parent folder uses the section-hub
 * layout variant, meaning it should render with a persistent sibling tab bar.
 */
export function isSectionHubChild(tree: NavigationNodeDTO[], page: PageDTO): boolean {
  if (page.isFolder) return false;
  const parentDocId = page.parentPage?.documentId;
  if (!parentDocId) return false;
  const parent = findNodeByDocumentId(tree, parentDocId);
  return parent?.layoutVariant === "section-hub";
}

export function findNodeByDocumentId(
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
