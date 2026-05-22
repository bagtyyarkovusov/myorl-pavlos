import { useCallback } from "react";

import type { NavigationNodeDTO } from "@/lib/cms/types";

import { MegaMenu } from "./MegaMenu";
import { NavigationAnchor } from "./NavigationAnchor";
import desktopStyles from "./DesktopNav.module.css";
import megaStyles from "./MegaMenu.module.css";

const styles = new Proxy({} as Record<string, string>, {
  get(_, key: string) {
    return desktopStyles[key] ?? megaStyles[key];
  },
});

type DesktopNavProps = {
  items: NavigationNodeDTO[];
  pillStyle: { width: number; left: number; opacity: number };
  openMenuId: string | null;
  onItemHover: (id: string) => void;
  onHoverClear: () => void;
  onMenuOpen: (id: string) => void;
  onMenuClose: () => void;
  registerPillRect: (id: string, rect: { width: number; left: number }) => void;
  overviewLinkLabel: string;
  sectionOverviewMoreHint: (hiddenCount: number) => string;
  featureBlurb: string;
  primaryNavLabel: string;
  topicsLabel: (count: number) => string;
};

export function DesktopNav({
  items,
  pillStyle,
  openMenuId,
  onItemHover,
  onHoverClear,
  onMenuOpen,
  onMenuClose,
  registerPillRect,
  overviewLinkLabel,
  sectionOverviewMoreHint,
  featureBlurb,
  primaryNavLabel,
  topicsLabel,
}: DesktopNavProps) {
  const activeMenu = openMenuId ? (items.find((n) => n.documentId === openMenuId) ?? null) : null;

  return (
    <div className={styles["megamenu-host"]} onMouseLeave={onMenuClose}>
      <nav
        className={styles["desktop-nav"]}
        aria-label={primaryNavLabel}
        onMouseLeave={onHoverClear}
      >
        <div
          className={styles["nav-magnetic-pill"]}
          style={{
            width: pillStyle.width,
            transform: `translateX(${pillStyle.left}px)`,
            opacity: pillStyle.opacity,
          }}
          aria-hidden="true"
        />
        {items.map((item) => (
          <DesktopNavItem
            key={item.documentId}
            item={item}
            isOpen={openMenuId === item.documentId}
            onItemHover={onItemHover}
            onMenuOpen={onMenuOpen}
            onMenuClose={onMenuClose}
            registerPillRect={registerPillRect}
          />
        ))}
      </nav>
      <div
        className={styles["megamenu-panel"]}
        data-open={activeMenu !== null}
        aria-hidden={activeMenu === null}
      >
        <div className={styles["megamenu-panel__surface"]}>
          {activeMenu ? (
            <MegaMenu
              item={activeMenu}
              featureBlurb={featureBlurb}
              overviewLinkLabel={overviewLinkLabel}
              sectionOverviewMoreHint={sectionOverviewMoreHint}
              topicsLabel={topicsLabel}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DesktopNavItem({
  item,
  isOpen,
  onItemHover,
  onMenuOpen,
  onMenuClose,
  registerPillRect,
}: {
  item: NavigationNodeDTO;
  isOpen: boolean;
  onItemHover: (id: string) => void;
  onMenuOpen: (id: string) => void;
  onMenuClose: () => void;
  registerPillRect: (id: string, rect: { width: number; left: number }) => void;
}) {
  const itemRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        registerPillRect(item.documentId, {
          width: el.offsetWidth,
          left: el.offsetLeft,
        });
      }
    },
    [item.documentId, registerPillRect],
  );

  if (item.children.length === 0) {
    return (
      <div
        ref={itemRef}
        className={styles["nav-item"]}
        data-id={item.documentId}
        onMouseEnter={() => onItemHover(item.documentId)}
      >
        <NavigationAnchor
          className={styles["nav-link"]}
          item={item}
          onMouseEnter={onMenuClose}
          onFocus={onMenuClose}
        />
      </div>
    );
  }

  return (
    <div
      ref={itemRef}
      className={`${styles["nav-item"]} ${isOpen ? styles["is-open"] : ""}`}
      data-id={item.documentId}
      onMouseEnter={() => {
        onItemHover(item.documentId);
        onMenuOpen(item.documentId);
      }}
    >
      <button
        className={styles["nav-trigger"]}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => (isOpen ? onMenuClose() : onMenuOpen(item.documentId))}
        onFocus={() => onMenuOpen(item.documentId)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onMenuClose();
          }
        }}
      >
        {item.navLabel}
        <span className={styles["nav-chevron"]} aria-hidden="true">
          ⌄
        </span>
      </button>
    </div>
  );
}
