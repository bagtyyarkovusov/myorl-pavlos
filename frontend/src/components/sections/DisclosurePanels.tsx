"use client";

import { useId, useState } from "react";

import { CmsHtml } from "@/components/CmsHtml";
import type { SectionDTO } from "@/lib/cms/types";

import styles from "./SectionRenderer.module.css";

type TabsPanelProps = {
  items: Extract<SectionDTO, { __component: "sections.tabs" }>["items"];
};

type DisclosureListProps = {
  items: Array<[string | null | undefined, string | null | undefined]>;
};

export function DisclosureList({ items }: DisclosureListProps) {
  const componentId = useId();
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set());

  function toggle(index: number) {
    setOpenIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className={styles["disclosure-list"]}>
      {items.map(([title, content], index) => {
        const isOpen = openIndexes.has(index);
        const panelId = `${componentId}-disclosure-${index}`;

        return (
          <div
            className={styles["disclosure"]}
            data-state={isOpen ? "open" : "closed"}
            key={`${title ?? "item"}-${index}`}
          >
            <button
              aria-controls={panelId}
              aria-expanded={isOpen}
              className={styles["disclosure__summary"]}
              onClick={() => toggle(index)}
              type="button"
            >
              <span>{title}</span>
              <span className={styles["disclosure__chevron"]} data-chevron aria-hidden="true" />
            </button>
            <div
              aria-hidden={!isOpen}
              className={styles["disclosure__body"]}
              id={panelId}
              inert={!isOpen}
              role="region"
            >
              <div className={styles["disclosure__body-inner"]}>
                <CmsHtml html={content} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TabsPanel({ items }: TabsPanelProps) {
  const componentId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = items[activeIndex] ?? null;

  if (items.length === 0 || !activeItem) {
    return null;
  }

  function moveActiveIndex(index: number) {
    setActiveIndex((index + items.length) % items.length);
  }

  return (
    <div className={styles["tabs"]}>
      <div className={styles["tabs__desktop"]}>
        <div className={styles["tabs__bar"]} role="tablist">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            const tabId = `${componentId}-tab-${index}`;
            const panelId = `${componentId}-panel-${index}`;

            return (
              <button
                aria-controls={panelId}
                aria-selected={isActive}
                className={styles["tabs__tab"]}
                id={tabId}
                key={`${item.title ?? "tab"}-${index}`}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    moveActiveIndex(activeIndex + 1);
                  } else if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveActiveIndex(activeIndex - 1);
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    setActiveIndex(0);
                  } else if (event.key === "End") {
                    event.preventDefault();
                    setActiveIndex(items.length - 1);
                  }
                }}
                onClick={() => setActiveIndex(index)}
                role="tab"
                type="button"
              >
                {item.title ?? `Tab ${index + 1}`}
              </button>
            );
          })}
        </div>
        <div
          aria-labelledby={`${componentId}-tab-${activeIndex}`}
          className={styles["tabs__panel"]}
          id={`${componentId}-panel-${activeIndex}`}
          role="tabpanel"
        >
          <CmsHtml html={activeItem.content} />
          {activeItem.link ? <a href={activeItem.link}>Open</a> : null}
        </div>
      </div>
      <div className={styles["tabs__mobile"]} data-testid="tabs-mobile-accordion">
        <DisclosureList items={items.map((item) => [item.title, item.content])} />
      </div>
    </div>
  );
}
