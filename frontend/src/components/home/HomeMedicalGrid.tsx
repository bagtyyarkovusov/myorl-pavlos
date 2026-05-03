import Link from "next/link";
import { CmsHtml } from "@/components/CmsHtml";
import { MediaFrame } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import type { LinkedResourceItemDTO } from "@/lib/cms/types";

import styles from "./home.module.css";

type HomeMedicalGridProps = {
  title: string;
  intro?: string | null;
  items: LinkedResourceItemDTO[];
  locale: string;
  learnMoreLabel: string;
};

export function HomeMedicalGrid({
  items,
  locale,
  learnMoreLabel,
}: HomeMedicalGridProps) {
  if (items.length === 0) return null;

  const [primaryItem, ...secondaryItems] = items;

  return (
    <PageSection className={styles["resource-section"]} header={null}>
      <div className={styles["resource-digest"]}>
        {primaryItem ? (
          <ResourceFeature
            item={primaryItem}
            href={resolveResourceHref(primaryItem, locale)}
            learnMoreLabel={learnMoreLabel}
          />
        ) : null}

        <ol className={styles["resource-list"]}>
          {secondaryItems.map((item, index) => {
            const href = resolveResourceHref(item, locale);

            return (
              <li className={styles["resource-row"]} key={`${item.title ?? "resource"}-${index}`}>
                <Link href={href}>
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
                  <span className={styles["resource-row__index"]}>
                    {String(index + 2).padStart(2, "0")}
                  </span>
                  <div className={styles["resource-row__body"]}>
                    <strong>{item.title ?? "Clinical resource"}</strong>
                    <CmsHtml className={styles["resource-row__text"]} html={item.description} />
                  </div>
                  <span className={styles["resource-row__arrow"]} aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </PageSection>
  );
}

function ResourceFeature({
  item,
  href,
  learnMoreLabel,
}: {
  item: LinkedResourceItemDTO;
  href: string;
  learnMoreLabel: string;
}) {
  return (
    <Link href={href} className={styles["resource-feature"]}>
      {item.image ? (
        <span className={styles["resource-feature__media"]} aria-hidden="true">
          <MediaFrame
            media={item.image}
            alt=""
            variant="wide"
            className={styles["resource-feature__frame"]}
          />
        </span>
      ) : null}
      <p className={styles["resource-feature__eyebrow"]}>01</p>
      <div className={styles["resource-feature__body"]}>
        <h3>{item.title ?? "Clinical resource"}</h3>
        <CmsHtml className={styles["resource-feature__text"]} html={item.description} />
      </div>
      <span className={styles["resource-feature__cta"]}>
        {learnMoreLabel}
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

function resolveResourceHref(item: LinkedResourceItemDTO, locale: string): string {
  return (
    item.targetUrl ??
    (item.targetPage?.slug ? `/${locale}/${item.targetPage.slug}` : `/${locale}/sitemap`)
  );
}
