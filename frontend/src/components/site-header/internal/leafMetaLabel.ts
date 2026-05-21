import type { NavigationNodeDTO } from "@/lib/cms/types";

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
  if (child.title && child.title.trim() !== child.navLabel.trim()) {
    return child.title;
  }
  return null;
}
