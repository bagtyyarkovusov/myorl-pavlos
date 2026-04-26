import type { NavigationNodeDTO, Locale } from "@/lib/cms/types";

const DEFAULT_NEEDLES = ["appointment", "rantevou", "ραντεβού", "записаться"];

function findInTree(nodes: NavigationNodeDTO[], needles: string[]): string | null {
  for (const node of nodes) {
    const haystack =
      `${node.slug} ${node.title} ${node.menuTitle ?? ""} ${node.navLabel}`.toLowerCase();
    if (needles.some((needle) => haystack.includes(needle.toLowerCase()))) {
      return node.href;
    }
    const childMatch = findInTree(node.children, needles);
    if (childMatch) {
      return childMatch;
    }
  }
  return null;
}

/**
 * Resolves the primary "book appointment" URL from the navigation tree.
 */
export function findAppointmentHref(
  navigation: NavigationNodeDTO[],
  locale: Locale,
  fallback: string = `/${locale}`,
): string {
  return findInTree(navigation, DEFAULT_NEEDLES) ?? fallback;
}
