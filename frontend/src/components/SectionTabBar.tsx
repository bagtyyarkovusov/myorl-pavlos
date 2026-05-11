"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

import { getTabBarConfig, type TabBarConfig } from "@/lib/cms/tab-bar";
import { getPageStrings } from "@/lib/i18n/page";
import type { NavigationNodeDTO, PageDTO } from "@/lib/cms/types";

import styles from "./SectionTabBar.module.css";

type SectionTabBarProps = {
  navigation: NavigationNodeDTO[];
  currentPage: PageDTO;
};

export function SectionTabBar({ navigation, currentPage }: SectionTabBarProps) {
  const config = getTabBarConfig(navigation, currentPage);
  if (!config) return null;

  const t = getPageStrings(currentPage.locale);

  // Find parent node from the full nodes for the back-link.
  const parentNode = config.isLeaf ? findParentInTree(navigation, currentPage) : null;

  return (
    <div className={styles["tab-bar-wrapper"]}>
      {config.isLeaf && parentNode ? (
        <Link href={parentNode.href} className={styles["back-link"]}>
          {t.backToSection(parentNode.navLabel || parentNode.title)}
        </Link>
      ) : null}
      <nav className={styles["tab-bar"]} aria-label={t.sectionNavLabel}>
        {config.visible.map((node) => {
          const isActive = node.documentId === currentPage.documentId;
          return (
            <Link
              key={node.documentId}
              href={node.href}
              className={`${styles.tab} ${isActive ? styles["tab--active"] : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {node.navLabel}
            </Link>
          );
        })}
        {config.overflow.length > 0 ? (
          <MoreDropdown
            items={config.overflow}
            currentDocId={currentPage.documentId}
            label={t.moreLabel(config.overflow.length)}
          />
        ) : null}
      </nav>
    </div>
  );
}

function MoreDropdown({
  items,
  currentDocId,
  label,
}: {
  items: NavigationNodeDTO[];
  currentDocId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, handleClickOutside]);

  return (
    <div className={styles["dropdown-wrapper"]} ref={ref}>
      <button
        className={`${styles.tab} ${styles["more-button"]}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        type="button"
      >
        {label}
      </button>
      {open ? (
        <ul className={styles["dropdown-menu"]} role="listbox" aria-label={label}>
          {items.map((node) => {
            const isActive = node.documentId === currentDocId;
            return (
              <li key={node.documentId} role="option" aria-selected={isActive}>
                <Link
                  href={node.href}
                  className={`${styles["dropdown-item"]} ${
                    isActive ? styles["dropdown-item--active"] : ""
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {node.navLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** Find a page's parent node in the navigation tree. */
function findParentInTree(tree: NavigationNodeDTO[], page: PageDTO): NavigationNodeDTO | null {
  const parentDocId = page.parentPage?.documentId;
  if (!parentDocId) return null;
  return findNodeByDocumentId(tree, parentDocId);
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
