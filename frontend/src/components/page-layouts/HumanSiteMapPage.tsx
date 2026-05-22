import Link from "next/link";

import { PageSection } from "@/components/PageSection";
import { filterHumanSitemapTree } from "@/lib/navigation/human-sitemap";
import { getPageStrings } from "@/lib/i18n/page";
import type { NavigationNodeDTO } from "@/lib/cms/types";

import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./HumanSiteMapPage.module.css";

type HumanSiteMapPageProps = PageLayoutProps & {
  directoryNavigation?: NavigationNodeDTO[];
};

function SitemapBranch({ nodes }: { nodes: NavigationNodeDTO[] }) {
  if (nodes.length === 0) return null;

  return (
    <ul className={styles["sitemap-list"]}>
      {nodes.map((node) => (
        <li key={node.documentId} className={styles["sitemap-item"]}>
          <Link href={node.href} className={styles["sitemap-link"]}>
            {node.navLabel || node.title}
          </Link>
          {node.children.length > 0 ? <SitemapBranch nodes={node.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function HumanSiteMapPage({ page, directoryNavigation = [] }: HumanSiteMapPageProps) {
  const t = getPageStrings(page.locale);
  const tree = filterHumanSitemapTree(directoryNavigation, { excludeSlug: page.slug });

  return (
    <PageSection rhythm="page">
      <PageHeader page={page} kicker={null} />
      <nav aria-label={t.humanSitemapNavLabel} className={styles["sitemap-nav"]}>
        <SitemapBranch nodes={tree} />
      </nav>
    </PageSection>
  );
}
