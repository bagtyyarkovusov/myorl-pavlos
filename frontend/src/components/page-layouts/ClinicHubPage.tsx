import Link from "next/link";

import { ClinicLocationBlock } from "@/components/clinic/ClinicLocationBlock";
import { PageSection } from "@/components/PageSection";
import { CmsHtml } from "@/components/CmsHtml";
import { getPage } from "@/lib/cms/cms-api";
import { CLINIC_CHILD_SLUGS } from "@/lib/cms/clinic-pages";
import { getPageStrings } from "@/lib/i18n/page";
import { PageHeader, type PageLayoutProps } from "./_shared";

import styles from "./ClinicHubPage.module.css";

export async function ClinicHubPage({ page, appointmentHref }: PageLayoutProps) {
  const t = getPageStrings(page.locale);
  const [alexandras, koukaki] = await Promise.all(
    CLINIC_CHILD_SLUGS.map((slug) => getPage(page.locale, slug)),
  );

  if (!alexandras || !koukaki) {
    throw new Error("ClinicHubPage: required child clinic pages missing from CMS");
  }

  return (
    <PageSection rhythm="page">
      <PageHeader page={page} kicker={null} showExcerpt={false} />

      {page.content ? (
        <div className={styles.intro}>
          <CmsHtml className="cms-html" html={page.content} />
        </div>
      ) : null}

      <nav className={styles.siblingLinks} aria-label={t.sectionNavLabel}>
        {CLINIC_CHILD_SLUGS.map((slug, index) => {
          const child = slug === "iatreio-alexandras" ? alexandras : koukaki;
          return (
            <span key={slug}>
              {index > 0 ? (
                <span className={styles.separator} aria-hidden="true">
                  ·
                </span>
              ) : null}
              <Link href={`#clinic-${slug}`}>{child.title}</Link>
            </span>
          );
        })}
      </nav>

      <div className={styles.locations}>
        <ClinicLocationBlock page={alexandras} appointmentHref={appointmentHref} />
        <ClinicLocationBlock page={koukaki} appointmentHref={appointmentHref} />
      </div>
    </PageSection>
  );
}
