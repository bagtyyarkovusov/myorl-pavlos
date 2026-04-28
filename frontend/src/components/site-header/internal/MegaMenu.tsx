import type { NavigationNodeDTO } from "@/lib/cms/types";

import { NavigationAnchor } from "./NavigationAnchor";
import { leafMetaLabel } from "./leafMetaLabel";
import styles from "../../SiteHeaderClient.module.css";

type MegaMenuProps = {
  item: NavigationNodeDTO;
  featureBlurb: string;
  overviewLinkLabel: string;
  overviewLinkHref: string;
};

export function MegaMenu({
  item,
  featureBlurb,
  overviewLinkLabel,
  overviewLinkHref,
}: MegaMenuProps) {
  return (
    <div className={styles["nav-panel__grid"]}>
      <div className={styles["nav-panel__feature"]}>
        <h2>{item.navLabel}</h2>
        <p>{featureBlurb}</p>
        <NavigationAnchor className={styles["nav-panel__cta"]} item={item}>
          {overviewLinkLabel}
          <span className={styles["cta-arrow"]} aria-hidden="true">
            →
          </span>
        </NavigationAnchor>
      </div>
      <div className={styles["nav-panel__links"]}>
        {item.children.slice(0, 12).map((child, index) => {
          const meta = leafMetaLabel(child, item);
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
