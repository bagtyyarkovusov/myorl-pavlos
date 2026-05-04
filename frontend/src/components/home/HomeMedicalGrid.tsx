import Link from "next/link";
import { CmsHtml } from "@/components/CmsHtml";
import { MediaFrame } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import type { LinkedResourceItemDTO } from "@/lib/cms/types";

import styles from "./HomeMedicalGrid.module.css";

type HomeMedicalGridProps = {
  title: string;
  intro?: string | null;
  items: LinkedResourceItemDTO[];
  locale: string;
  learnMoreLabel: string;
  viewAllLabel: string;
};

export function HomeMedicalGrid({
  items,
  locale,
  learnMoreLabel,
  viewAllLabel,
}: HomeMedicalGridProps) {
  if (items.length === 0) return null;

  return (
    <PageSection className={styles["resource-section"]} header={null}>
      <ol className={styles["resource-list"]}>
        {items.map((item, index) => {
          const href = resolveResourceHref(item, locale);

          return (
            <li className={styles["resource-row"]} key={`${item.title ?? "resource"}-${index}`}>
              <Link href={href}>
                <span className={styles["resource-row__visual"]}>
                  <span className={styles["resource-row__media"]} aria-hidden="true">
                    {item.image ? (
                      <MediaFrame
                        media={item.image}
                        alt=""
                        variant="wide"
                        className={styles["resource-row__frame"]}
                      />
                    ) : (
                      <span className={styles["resource-row__placeholder"]} />
                    )}
                  </span>
                </span>
                <div className={styles["resource-row__body"]}>
                  <strong>{item.title ?? "Clinical resource"}</strong>
                  <CmsHtml className={styles["resource-row__text"]} html={item.description} />
                  <span className={styles["resource-row__cta"]}>
                    {learnMoreLabel} <span aria-hidden="true">→</span>
                  </span>
                </div>
                <span className={styles["resource-row__arrow"]} aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <Link href={`/${locale}/yperesies`} className={styles["resource-view-all"]}>
        {viewAllLabel} <span aria-hidden="true">→</span>
      </Link>
    </PageSection>
  );
}

function resolveResourceHref(item: LinkedResourceItemDTO, locale: string): string {
  return (
    item.targetUrl ??
    (item.targetPage?.slug ? `/${locale}/${item.targetPage.slug}` : `/${locale}/sitemap`)
  );
}
