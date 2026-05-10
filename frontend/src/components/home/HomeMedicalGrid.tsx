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
  title,
  intro,
  items,
  locale,
  learnMoreLabel,
  viewAllLabel,
}: HomeMedicalGridProps) {
  if (items.length === 0) return null;

  return (
    <PageSection
      className={styles["resource-section"]}
      heading={intro ? { title, intro } : { title }}
    >
      <ol className={styles["resource-list"]} role="list">
        {items.slice(0, 6).map((item, index) => {
          const href = resolveResourceHref(item, locale);

          return (
            <li className={styles["resource-row"]} key={`${item.title ?? "resource"}-${index}`}>
              <Link href={href} className={styles["resource-row__link"]}>
                <span className={styles["resource-row__visual"]}>
                  <MediaFrame
                    media={item.image}
                    alt={item.image?.alternativeText || item.title || ""}
                    variant="wide"
                    className={styles["resource-row__frame"]}
                    sizes="(max-width: 639px) 80px, (max-width: 1023px) 50vw, 180px"
                  />
                </span>

                <div className={styles["resource-row__body"]}>
                  {item.title ? (
                    <h3 className={styles["resource-row__title"]}>{item.title}</h3>
                  ) : null}
                  {item.description ? (
                    <CmsHtml className={styles["resource-row__text"]} html={item.description} />
                  ) : null}
                  <span className={styles["resource-row__cta"]}>
                    {learnMoreLabel}
                    <span aria-hidden="true"> →</span>
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

      {items.length > 6 ? (
        <Link href={`/${locale}/yperesies`} className={styles["resource-view-all"]}>
          {viewAllLabel}
          <span aria-hidden="true"> →</span>
        </Link>
      ) : null}
    </PageSection>
  );
}

function resolveResourceHref(item: LinkedResourceItemDTO, locale: string): string {
  return (
    item.targetUrl ??
    (item.targetPage?.slug ? `/${locale}/${item.targetPage.slug}` : `/${locale}/sitemap`)
  );
}
