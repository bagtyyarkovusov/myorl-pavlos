"use client";

import { useState } from "react";
import type { NavigationNodeDTO } from "@/lib/cms/types";

import { NavigationAnchor } from "./NavigationAnchor";
import styles from "./MobileDrawer.module.css";

type MobileMenuProps = {
  items: NavigationNodeDTO[];
  overviewMobile: string;
  onNavigate: () => void;
};

function AccordionParent({
  item,
  overviewMobile,
  onNavigate,
  staggerIndex,
}: {
  item: NavigationNodeDTO;
  overviewMobile: string;
  onNavigate: () => void;
  staggerIndex: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`${styles["mobile-nav-parent"]} ${styles["mobile-stagger-item"]}`}
      data-open={open}
      style={{ "--stagger-index": staggerIndex } as React.CSSProperties}
    >
      <button
        className={styles["mobile-nav-parent__trigger"]}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles["mobile-nav-parent__label"]}>
          <span>{item.navLabel}</span>
          <span className={styles["mobile-nav-parent__subtitle"]}>{item.title}</span>
        </span>
        <span className={styles["mobile-nav-parent__chevron"]} aria-hidden="true">
          ⌄
        </span>
      </button>

      <div className={styles["mobile-nav-parent__children"]}>
        <div className={styles["mobile-nav-parent__children-inner"]}>
          <div className={styles["mobile-nav-child-list"]}>
            <NavigationAnchor
              item={item}
              className={`${styles["mobile-nav-child-item"]} ${styles["is-overview"]}`}
              onClick={onNavigate}
            >
              {overviewMobile}
            </NavigationAnchor>
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

export function MobileMenu({ items, overviewMobile, onNavigate }: MobileMenuProps) {
  return (
    <>
      {items.map((item, idx) =>
        item.children.length === 0 ? (
          <NavigationAnchor
            key={item.documentId}
            item={item}
            className={`${styles["mobile-nav-link"]} ${styles["mobile-stagger-item"]}`}
            onClick={onNavigate}
            style={{ "--stagger-index": idx } as React.CSSProperties}
          >
            {item.navLabel}
          </NavigationAnchor>
        ) : (
          <AccordionParent
            key={item.documentId}
            item={item}
            overviewMobile={overviewMobile}
            onNavigate={onNavigate}
            staggerIndex={idx}
          />
        ),
      )}
    </>
  );
}
