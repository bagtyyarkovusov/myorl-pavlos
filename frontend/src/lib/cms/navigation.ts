import { normalizeOptionalText } from "./text";
import type {
  Locale,
  NavigationInput,
  NavigationNodeDTO,
  PageDTO,
  StrapiLocalization,
} from "./types";

export function buildNavigationTree(pages: NavigationInput[], locale: Locale): NavigationNodeDTO[] {
  const scopedPages = pages
    .filter((page) => page.locale === locale && !page.hideFromMenu)
    .sort(compareNavigationItems);

  const nodes = new Map<string, NavigationNodeDTO>();
  for (const page of scopedPages) {
    nodes.set(page.documentId, {
      ...page,
      href: hrefForPage(page),
      children: [],
    });
  }

  const roots: NavigationNodeDTO[] = [];
  for (const node of nodes.values()) {
    const parentDocumentId = node.parentPage?.documentId;
    const parent = parentDocumentId ? nodes.get(parentDocumentId) : undefined;
    if (parent && !wouldCreateCycle(nodes, node.documentId, parentDocumentId as string)) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const node of nodes.values()) {
    node.children.sort(compareNavigationItems);
  }
  roots.sort(compareNavigationItems);

  return roots;
}

export function hrefForPage(page: Pick<PageDTO, "locale" | "slug" | "externalUrl">): string {
  const external = normalizeOptionalText(page.externalUrl);
  if (external) {
    return external;
  }
  return hrefForLocaleSlug(page.locale, page.slug);
}

export function hrefForLocaleSlug(locale: Locale, slug: string): string {
  return slug === "index" ? `/${locale}` : `/${locale}/${slug}`;
}

function compareNavigationItems(left: NavigationInput, right: NavigationInput): number {
  return (
    left.menuIndex - right.menuIndex ||
    left.slug.localeCompare(right.slug) ||
    left.navLabel.localeCompare(right.navLabel)
  );
}

export function toLocalizationList(value: unknown): StrapiLocalization[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is StrapiLocalization => typeof item === "object" && item !== null,
  );
}

function wouldCreateCycle(
  nodes: Map<string, NavigationNodeDTO>,
  childId: string,
  parentId: string,
): boolean {
  const visited = new Set<string>([childId]);
  let current: NavigationNodeDTO | undefined = nodes.get(parentId);
  while (current) {
    if (visited.has(current.documentId)) {
      return true;
    }
    visited.add(current.documentId);
    const grandParentId = current.parentPage?.documentId;
    if (!grandParentId) {
      return false;
    }
    current = nodes.get(grandParentId);
  }
  return false;
}
