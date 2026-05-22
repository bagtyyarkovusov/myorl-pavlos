import type { NavigationNodeDTO } from "@/lib/cms/types";

function alternateTitle(node: NavigationNodeDTO): string | null {
  const title = node.title?.trim();
  const navLabel = node.navLabel.trim();
  if (title && title.toLocaleLowerCase() !== navLabel.toLocaleLowerCase()) {
    return title;
  }
  return null;
}

export function sectionEntryCount(item: NavigationNodeDTO): number {
  return item.children.length;
}

export function leafMetaLabel(
  child: NavigationNodeDTO,
  parent: NavigationNodeDTO,
  topicsLabel: (count: number) => string = (count) => `${count} topics`,
): string | null {
  if (child.children.length > 1) {
    return topicsLabel(child.children.length);
  }
  const excerpt = child.excerpt?.trim();
  if (excerpt) {
    return excerpt;
  }
  return alternateTitle(child);
}
