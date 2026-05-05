import Link from "next/link";

import { getTabBarNodes } from "@/lib/cms/tab-bar";
import type { NavigationNodeDTO, PageDTO } from "@/lib/cms/types";

import styles from "./SectionTabBar.module.css";

type SectionTabBarProps = {
  navigation: NavigationNodeDTO[];
  currentPage: PageDTO;
};

export function SectionTabBar({ navigation, currentPage }: SectionTabBarProps) {
  const nodes = getTabBarNodes(navigation, currentPage);
  if (!nodes) return null;

  return (
    <nav className={styles["tab-bar"]} aria-label="Section navigation">
      {nodes.map((node) => {
        const isActive = node.documentId === currentPage.documentId;
        return (
          <Link
            key={node.documentId}
            href={node.href}
            className={styles.tab}
            aria-current={isActive ? "page" : undefined}
          >
            {node.navLabel}
          </Link>
        );
      })}
    </nav>
  );
}
