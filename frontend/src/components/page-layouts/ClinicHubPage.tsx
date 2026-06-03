import Link from "next/link";

import { ClinicLocationBlock } from "@/components/clinic/ClinicLocationBlock";
import { PageSection } from "@/components/PageSection";
import { CmsHtml } from "@/components/CmsHtml";
import { LiteMap } from "@/components/LiteMap";
import { PrimaryContactPhones } from "@/components/PrimaryContactPhones";
import { getPage } from "@/lib/cms/cms-api";
import { CLINIC_CHILD_SLUGS } from "@/lib/cms/clinic-pages";
import { getPageStrings } from "@/lib/i18n/page";
import {
  resolveContactEmail,
  resolveDoctorName,
  resolveDoctorSpecialty,
  resolveVisitAddressBlock,
  mapEmbedSrcFromAddress,
  mapsSearchUrl,
} from "@/lib/site/contact-fallbacks";
import { PageHeader, type PageLayoutProps } from "./_shared";

import styles from "./ClinicHubPage.module.css";

export async function ClinicHubPage({ page, appointmentHref, globalSettings }: PageLayoutProps) {
  const t = getPageStrings(page.locale);
  const [alexandras, koukaki] = await Promise.all(
    CLINIC_CHILD_SLUGS.map((slug) => getPage(page.locale, slug)),
  );

  if (!alexandras || !koukaki) {
    throw new Error("ClinicHubPage: required child clinic pages missing from CMS");
  }

  const doctorName = globalSettings ? resolveDoctorName(globalSettings) : null;
  const doctorSpecialty = globalSettings ? resolveDoctorSpecialty(globalSettings) : null;
  const addressBlock = globalSettings
    ? resolveVisitAddressBlock(globalSettings, page.locale)
    : null;
  const email = globalSettings ? resolveContactEmail(globalSettings) : null;
  const mapSrc = addressBlock ? mapEmbedSrcFromAddress(addressBlock) : null;
  const mapsUrl = addressBlock ? mapsSearchUrl(addressBlock) : null;

  return (
    <PageSection rhythm="page">
      <PageHeader page={page} kicker={null} showExcerpt={false} heroImageVariant="accent" />

      {doctorName || doctorSpecialty ? (
        <div className={styles.doctor}>
          {doctorName ? <span className={styles.doctorName}>{doctorName}</span> : null}
          {doctorSpecialty ? (
            <span className={styles.doctorSpecialty}>{doctorSpecialty}</span>
          ) : null}
        </div>
      ) : null}

      {page.content ? (
        <div className={styles.intro}>
          <CmsHtml className="cms-html" html={page.content} />
        </div>
      ) : null}

      {addressBlock || email || globalSettings ? (
        <section className={styles.visit} aria-label={t.officeVisitMapSectionLabel}>
          <div className={styles.visitMeta}>
            {addressBlock ? (
              <div className={styles.visitGroup}>
                <span className={styles.visitLabel}>{t.officeLabelAddress}</span>
                <p className={styles.visitValue}>{addressBlock}</p>
              </div>
            ) : null}
            {globalSettings ? (
              <div className={styles.visitGroup}>
                <span className={styles.visitLabel}>{t.officeLabelPhone}</span>
                <p className={styles.visitValue}>
                  <PrimaryContactPhones
                    locale={page.locale}
                    settings={globalSettings}
                    linkClassName={styles.phoneLink}
                  />
                </p>
              </div>
            ) : null}
            {email ? (
              <div className={styles.visitGroup}>
                <span className={styles.visitLabel}>{t.officeLabelEmail}</span>
                <p className={styles.visitValue}>
                  <a className={styles.emailLink} href={`mailto:${email}`}>
                    {email}
                  </a>
                </p>
              </div>
            ) : null}
          </div>

          {mapSrc ? (
            <div className={styles.mapWrap}>
              <LiteMap
                src={mapSrc}
                title={t.officeMapTitle}
                loadLabel={t.officeMapShowLabel}
                hint={addressBlock}
                externalHref={mapsUrl ?? undefined}
              />
            </div>
          ) : null}
        </section>
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
