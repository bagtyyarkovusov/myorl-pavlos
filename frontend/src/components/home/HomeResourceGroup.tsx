import Link from "next/link";
import { CmsHtml } from "@/components/CmsHtml";
import { MediaFrame } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import type { HomeResourceGroupSectionDTO } from "@/lib/cms/types";

import styles from "./HomeResourceGroup.module.css";

type HomeResourceGroupProps = {
  section: HomeResourceGroupSectionDTO;
  locale: string;
  learnMoreLabel: string;
};

export function HomeResourceGroup({ section, locale, learnMoreLabel }: HomeResourceGroupProps) {
  if (section.items.length === 0) return null;

  const viewAllHref = section.viewAllTarget?.slug
    ? `/${locale}/${section.viewAllTarget.slug}`
    : `/${locale}/sitemap`;

  return (
    <PageSection
      rhythm="compact"
      heading={
        section.heading ? { title: section.heading, intro: section.intro ?? undefined } : undefined
      }
    >
      <ol className={styles["resource-list"]} role="list">
        {section.items.map((item, index) => {
          const href =
            item.targetUrl ??
            (item.targetPage?.slug ? `/${locale}/${item.targetPage.slug}` : `/${locale}/sitemap`);

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
                  <span className={styles["resource-row__cta"]}>{learnMoreLabel}</span>
                </div>

                <span className={styles["resource-row__arrow"]} aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {section.viewAllLabel ? (
        <Link href={viewAllHref} className={styles["resource-view-all"]}>
          {section.viewAllLabel}
          <span aria-hidden="true"> →</span>
        </Link>
      ) : null}
    </PageSection>
  );
}
