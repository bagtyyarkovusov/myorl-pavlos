"use client";

import { useState } from "react";
import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionTabBar } from "@/components/SectionTabBar";
import { StructuredData } from "@/components/StructuredData";
import { getCmsConfig } from "@/lib/cms/env";
import type { ContactClinicDTO } from "@/lib/cms/types";
import { stripTags } from "@/lib/html";
import { buildContactPointLd } from "@/lib/structured-data/contact-point";
import { buildMedicalBusinessLd } from "@/lib/structured-data/medical-business";
import { buildPageBreadcrumbLd } from "@/lib/structured-data/page-breadcrumbs";
import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./_shared.module.css";

export function ContactPage({ page, navigation = [] }: PageLayoutProps) {
  const contactSection = page.sections.find((s) => s.__component === "sections.contact");
  const clinics =
    contactSection && contactSection.__component === "sections.contact"
      ? contactSection.clinics
      : [];
  const mappableClinics = clinics.filter(hasCoordinates);
  const [activeClinicName, setActiveClinicName] = useState<string | null>(
    mappableClinics[0]?.name ?? clinics[0]?.name ?? null,
  );
  const activeClinic =
    clinics.find((clinic) => clinic.name === activeClinicName) ?? mappableClinics[0] ?? clinics[0];
  const primaryClinic =
    clinics.find((clinic) => clinic.phone || clinic.email) ?? clinics[0] ?? null;
  const primaryPhone = primaryClinic?.phone ?? null;
  const primaryEmail = primaryClinic?.email ?? null;
  const mapCenter = (() => {
    const center = mappableClinics[0] ?? null;
    return center ? `${center.latitude},${center.longitude}` : undefined;
  })();
  const mapSrc = (() => {
    const center = mappableClinics[0] ?? null;
    const query = center
      ? `${center.latitude},${center.longitude}`
      : stripTags(clinics[0]?.addressHtml ?? "");
    if (!query) return undefined;
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;
  })();

  const breadcrumbLd = buildPageBreadcrumbLd(page);
  const contactLd = primaryPhone ? buildContactPointLd(primaryPhone) : null;
  const config = getCmsConfig();
  const medicalBusinessLd = primaryClinic
    ? buildMedicalBusinessLd({
        siteUrl: config.siteUrl,
        name: page.seoTitle || page.title,
        description: page.excerpt ?? undefined,
        telephone: primaryPhone ?? undefined,
        address: stripTags(primaryClinic.addressHtml).trim() || undefined,
        imageUrls: page.featuredImage?.url ? [page.featuredImage.url] : undefined,
      })
    : null;

  return (
    <PageSection>
      {breadcrumbLd ? <StructuredData data={breadcrumbLd} /> : null}
      {contactLd ? <StructuredData data={contactLd} /> : null}
      {medicalBusinessLd ? <StructuredData data={medicalBusinessLd} /> : null}
      <PageHeader page={page} kicker={null} />
      <SectionTabBar navigation={navigation} currentPage={page} />
      {contactSection && contactSection.__component === "sections.contact" ? (
        <div className={styles["contact-shell"]} data-contact-split="true">
          <div className={styles["contact-panel"]}>
            <div className={styles["contact-band"]} data-contact-band>
              {primaryPhone ? (
                <a className={styles["contact-phone"]} href={`tel:${toTelHref(primaryPhone)}`}>
                  {primaryPhone}
                </a>
              ) : null}
              {primaryEmail ? (
                <a className={styles["contact-email"]} href={`mailto:${primaryEmail}`}>
                  {primaryEmail}
                </a>
              ) : null}
              {contactSection.details.map((detail, index) => (
                <article className={styles["contact-detail"]} key={`${detail.type}-${index}`}>
                  <h2>{detail.type}</h2>
                  <CmsHtml html={detail.valueHtml} />
                </article>
              ))}
              <CmsHtml html={page.content} />
            </div>

            {clinics.length > 0 ? (
              <section className={styles["contact-clinics"]} aria-label="Clinics">
                {clinics.map((clinic) => {
                  const isActive = clinic.name === activeClinic?.name;
                  return (
                    <article
                      className={styles["clinic-card"]}
                      key={clinic.name}
                      role="region"
                      aria-label={`${clinic.name} details`}
                      data-active={isActive ? "true" : "false"}
                    >
                      <button
                        className={styles["clinic-trigger"]}
                        type="button"
                        aria-expanded={isActive}
                        onClick={() => setActiveClinicName(clinic.name)}
                      >
                        {clinic.name}
                      </button>
                      <div className={styles["clinic-body"]} hidden={!isActive}>
                        <CmsHtml html={clinic.addressHtml} />
                        {clinic.phone ? (
                          <a href={`tel:${toTelHref(clinic.phone)}`}>{clinic.phone}</a>
                        ) : null}
                        {clinic.email ? (
                          <a href={`mailto:${clinic.email}`}>{clinic.email}</a>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </section>
            ) : null}

            {mappableClinics.length > 0 ? (
              <details className={styles["contact-map-mobile"]}>
                <summary>Map</summary>
                <ClinicMap clinics={mappableClinics} mapCenter={mapCenter} mapSrc={mapSrc} />
              </details>
            ) : null}
          </div>

          {mappableClinics.length > 0 ? (
            <div className={styles["contact-map-desktop"]}>
              <ClinicMap clinics={mappableClinics} mapCenter={mapCenter} mapSrc={mapSrc} />
            </div>
          ) : null}
        </div>
      ) : null}
    </PageSection>
  );
}

function ClinicMap({
  clinics,
  mapCenter,
  mapSrc,
}: {
  clinics: ContactClinicDTO[];
  mapCenter?: string;
  mapSrc?: string;
}) {
  if (!mapSrc) return null;

  return (
    <section className={styles["clinic-map"]} aria-label="Clinic map" data-map-center={mapCenter}>
      <iframe
        title="Clinic map"
        src={mapSrc}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </section>
  );
}

function hasCoordinates(clinic: ContactClinicDTO): clinic is ContactClinicDTO & {
  latitude: number;
  longitude: number;
} {
  return typeof clinic.latitude === "number" && typeof clinic.longitude === "number";
}

function toTelHref(value: string): string {
  return value.replace(/[^\d+]/g, "");
}
