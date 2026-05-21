import { SectionTabBar } from "@/components/SectionTabBar";
import { PageBody } from "./PageBody";
import { PageHeader, type PageLayoutProps } from "./_shared";

import layoutStyles from "./_shared.module.css";
import styles from "./SectionHubPage.module.css";

export function SectionHubPage({ page, navigation = [] }: PageLayoutProps) {
  return (
    <div className={layoutStyles["page-shell"]}>
      <div className="container">
        <div className={styles.hubChrome}>
          <PageHeader page={page} kicker={null} />
          <SectionTabBar navigation={navigation} currentPage={page} />
        </div>
        <div className={styles.hubBodySlot}>
          <PageBody page={page} proseStackGap="compact" hubChild />
        </div>
      </div>
    </div>
  );
}
