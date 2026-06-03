import type { NavigationNodeDTO } from "@/lib/cms/types";

import { NavigationAnchor } from "./NavigationAnchor";
import { leafMetaLabel, sectionEntryCount } from "./leafMetaLabel";
import { showsSectionOverviewLink } from "./sectionOverviewLink";
import styles from "./MegaMenu.module.css";

/** Above this many direct children, the link grid switches to a denser multi-column layout. */
export const MEGA_MENU_DENSE_THRESHOLD = 16;

type MegaMenuProps = {
  item: NavigationNodeDTO;
  featureBlurb: string;
  overviewLinkLabel: string;
  /** Retained for caller compatibility; the menu now shows every child, so no "+N more" hint renders. */
  sectionOverviewMoreHint?: (hiddenCount: number) => string;
  topicsLabel: (count: number) => string;
};

export function MegaMenu({ item, featureBlurb, overviewLinkLabel, topicsLabel }: MegaMenuProps) {
  const entryCount = sectionEntryCount(item);
  const entryLabel = entryCount > 0 ? topicsLabel(entryCount) : null;
  const showOverviewLink = showsSectionOverviewLink(item);
  const isDense = item.children.length > MEGA_MENU_DENSE_THRESHOLD;

  return (
    <div className={styles["nav-panel__grid"]}>
      <div className={styles["nav-panel__feature"]}>
        <h2>{item.navLabel}</h2>
        {!showOverviewLink && entryLabel ? (
          <span className={styles["nav-panel__count"]}>{entryLabel}</span>
        ) : null}
        <p>{featureBlurb}</p>
        {showOverviewLink ? (
          <div className={styles["nav-panel__cta-block"]}>
            <div className={styles["nav-panel__cta-row"]}>
              <NavigationAnchor className={styles["nav-panel__cta"]} item={item}>
                {overviewLinkLabel}
                <span className={styles["cta-arrow"]} aria-hidden="true">
                  →
                </span>
              </NavigationAnchor>
              {entryLabel ? (
                <span className={styles["nav-panel__cta-count"]}>{entryLabel}</span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      <div className={styles["nav-panel__links"]} data-dense={isDense ? "true" : undefined}>
        {item.children.map((child, index) => {
          const meta = leafMetaLabel(child, item, topicsLabel);
          return (
            <div
              key={child.documentId}
              className={styles["nav-panel__link-wrapper"]}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <NavigationAnchor item={child}>
                <span className={styles.title}>{child.navLabel}</span>
                {meta ? <span className={styles.meta}>{meta}</span> : null}
              </NavigationAnchor>
            </div>
          );
        })}
      </div>
    </div>
  );
}
