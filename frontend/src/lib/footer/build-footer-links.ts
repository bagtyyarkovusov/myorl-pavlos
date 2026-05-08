import type { FooterCategory, NavigationNodeDTO } from "@/lib/cms/types";

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterLinkGroups = {
  services: FooterLink[];
  patients: FooterLink[];
  company: FooterLink[];
};

function flatten(nodes: NavigationNodeDTO[]): NavigationNodeDTO[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

function linksFor(
  flat: NavigationNodeDTO[],
  category: Exclude<FooterCategory, "none">,
): FooterLink[] {
  return flat
    .filter((node) => node.footerCategory === category)
    .sort((a, b) => {
      const indexDiff = a.menuIndex - b.menuIndex;
      if (indexDiff !== 0) return indexDiff;
      return a.slug.localeCompare(b.slug);
    })
    .map((node) => ({
      label: node.navLabel || node.title,
      href: node.href,
    }));
}

export function buildFooterLinks(navigation: NavigationNodeDTO[]): FooterLinkGroups {
  const flat = flatten(navigation);
  return {
    services: linksFor(flat, "services"),
    patients: linksFor(flat, "patients"),
    company: linksFor(flat, "company"),
  };
}
