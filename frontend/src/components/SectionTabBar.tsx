"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

import { getTabBarConfig } from "@/lib/cms/tab-bar";
import { getPageStrings } from "@/lib/i18n/page";
import type { NavigationNodeDTO, PageDTO } from "@/lib/cms/types";

import styles from "./SectionTabBar.module.css";

type SectionTabBarProps = {
  navigation: NavigationNodeDTO[];
  currentPage: PageDTO;
};

const SCROLL_EDGE = 4;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function SectionTabBar({ navigation, currentPage }: SectionTabBarProps) {
  const config = getTabBarConfig(navigation, currentPage);
  const tabBarRef = useRef<HTMLElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const tabBar = tabBarRef.current;
    if (!tabBar) return;

    setCanScrollPrev(tabBar.scrollLeft > SCROLL_EDGE);
    setCanScrollNext(tabBar.scrollLeft + tabBar.clientWidth < tabBar.scrollWidth - SCROLL_EDGE);
  }, []);

  const tabCount = (config?.visible.length ?? 0) + (config?.overflow.length ?? 0);

  useEffect(() => {
    const tabBar = tabBarRef.current;
    if (!tabBar) return;

    updateScrollState();
    tabBar.addEventListener("scroll", updateScrollState, { passive: true });

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(tabBar);
    }

    const raf = requestAnimationFrame(updateScrollState);
    const delayed = window.setTimeout(updateScrollState, 300);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(delayed);
      tabBar.removeEventListener("scroll", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [currentPage.documentId, tabCount, updateScrollState]);

  const scrollTabs = useCallback((direction: -1 | 1) => {
    const tabBar = tabBarRef.current;
    if (!tabBar) return;

    const tabs = tabBar.querySelectorAll<HTMLElement>("[data-section-tab]");
    if (tabs.length === 0) return;

    const tabBarLeft = tabBar.scrollLeft;
    const tabBarRight = tabBarLeft + tabBar.clientWidth;
    const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";

    if (direction > 0) {
      for (const tab of tabs) {
        if (tab.offsetLeft + tab.offsetWidth > tabBarRight + SCROLL_EDGE) {
          tabBar.scrollTo({ left: tab.offsetLeft, behavior });
          return;
        }
      }
      tabBar.scrollTo({ left: tabBar.scrollWidth, behavior });
      return;
    }

    for (let index = tabs.length - 1; index >= 0; index -= 1) {
      const tab = tabs[index]!;
      if (tab.offsetLeft < tabBarLeft - SCROLL_EDGE) {
        tabBar.scrollTo({ left: tab.offsetLeft, behavior });
        return;
      }
    }
    tabBar.scrollTo({ left: 0, behavior });
  }, []);

  if (!config) return null;

  const t = getPageStrings(currentPage.locale);
  const showScrollControls = canScrollPrev || canScrollNext;

  // Find parent node from the full nodes for the back-link.
  const parentNode = config.isLeaf ? findParentInTree(navigation, currentPage) : null;

  return (
    <div
      className={styles["tab-bar-wrapper"]}
      data-scrollable={showScrollControls ? "true" : "false"}
    >
      {config.isLeaf && parentNode ? (
        <Link href={parentNode.href} className={styles["back-link"]}>
          {t.backToSection(parentNode.navLabel || parentNode.title)}
        </Link>
      ) : null}
      {showScrollControls ? (
        <div className={styles["tab-scroll-controls"]}>
          <button
            type="button"
            className={styles["tab-scroll-control"]}
            aria-label={t.sectionNavPrevious}
            onClick={() => scrollTabs(-1)}
            disabled={!canScrollPrev}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
              <path
                d="M9.5 3.5 5 8l4.5 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={styles["tab-scroll-control"]}
            aria-label={t.sectionNavNext}
            onClick={() => scrollTabs(1)}
            disabled={!canScrollNext}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
              <path
                d="M6.5 3.5 11 8l-4.5 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ) : null}
      <nav ref={tabBarRef} className={styles["tab-bar"]} aria-label={t.sectionNavLabel}>
        {config.visible.map((node) => {
          const isActive = node.documentId === currentPage.documentId;
          return (
            <Link
              key={node.documentId}
              href={node.href}
              className={`${styles.tab} ${isActive ? styles["tab--active"] : ""}`}
              aria-current={isActive ? "page" : undefined}
              data-section-tab
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
        data-section-tab
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
