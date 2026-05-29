"use client";

import { useState } from "react";
import type { NavigationNodeDTO } from "@/lib/cms/types";

import { NavigationAnchor } from "./NavigationAnchor";
import { sectionEntryCount } from "./leafMetaLabel";
import { showsSectionOverviewLink } from "./sectionOverviewLink";
import styles from "./MobileDrawer.module.css";

type MobileMenuProps = {
  items: NavigationNodeDTO[];
  overviewMobile: string;
  topicsLabel: (count: number) => string;
  onNavigate: () => void;
};

function AccordionParent({
  item,
  overviewMobile,
  topicsLabel,
  onNavigate,
}: {
  item: NavigationNodeDTO;
  overviewMobile: string;
  topicsLabel: (count: number) => string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const entryCount = sectionEntryCount(item);
  const entryLabel = entryCount > 0 ? topicsLabel(entryCount) : null;
  const showOverviewLink = showsSectionOverviewLink(item);

  return (
    <div className={styles["mobile-nav-parent"]} data-open={open}>
      <button
        className={styles["mobile-nav-parent__trigger"]}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles["mobile-nav-parent__label"]}>
          <span className={styles["mobile-nav-parent__title"]}>{item.navLabel}</span>
          {entryLabel ? (
            <span className={styles["mobile-nav-parent__count"]}>{entryLabel}</span>
          ) : null}
        </span>
        <span className={styles["mobile-nav-parent__chevron"]} aria-hidden="true">
          ⌄
        </span>
      </button>

      <div className={styles["mobile-nav-parent__children"]}>
        <div className={styles["mobile-nav-parent__children-inner"]}>
          <div className={styles["mobile-nav-child-list"]}>
            {showOverviewLink ? (
              <NavigationAnchor
                item={item}
                className={`${styles["mobile-nav-child-item"]} ${styles["is-overview"]}`}
                onClick={onNavigate}
              >
                {overviewMobile}
              </NavigationAnchor>
            ) : null}
            {item.children.map((child) => (
              <NavigationAnchor
                key={child.documentId}
                item={child}
                className={styles["mobile-nav-child-item"]}
                onClick={onNavigate}
              >
                {child.navLabel}
              </NavigationAnchor>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileMenu({ items, overviewMobile, topicsLabel, onNavigate }: MobileMenuProps) {
  return (
    <>
      {items.map((item) =>
        item.children.length === 0 ? (
          <NavigationAnchor
            key={item.documentId}
            item={item}
            className={styles["mobile-nav-link"]}
            onClick={onNavigate}
          >
            {item.navLabel}
          </NavigationAnchor>
        ) : (
          <AccordionParent
            key={item.documentId}
            item={item}
            overviewMobile={overviewMobile}
            topicsLabel={topicsLabel}
            onNavigate={onNavigate}
          />
        ),
      )}
    </>
  );
}
