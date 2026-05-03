import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { HomeMedicalGrid } from "@/components/home/HomeMedicalGrid";
import { HomePromoCarousel } from "@/components/home/HomePromoCarousel";
import { HomeVideoTheater } from "@/components/home/HomeVideoTheater";
import { getHomeStrings } from "@/lib/i18n/home";
import type { Locale, SectionDTO } from "@/lib/cms/types";

import { DefaultSectionRenderer } from "./DefaultSectionRenderer";
import styles from "./SectionRenderer.module.css";

export function HomeSectionRenderer({ section, locale }: { section: SectionDTO; locale: Locale }) {
  const t = getHomeStrings(locale);

  switch (section.__component) {
    case "sections.promo-slider":
      return (
        <HomePromoCarousel
          title={section.heading || t.categoriesEyebrow}
          intro={section.intro}
          slides={section.slides}
          locale={locale}
          learnMoreLabel={t.learnMore}
        />
      );
    case "sections.advantages":
      return null;
    case "sections.linked-resources":
      return (
        <HomeMedicalGrid
          title={section.heading || t.journalTitleLine1}
          intro={section.intro || t.journalIntro}
          items={section.items}
          locale={locale}
          learnMoreLabel={t.learnMore}
          viewAllLabel={t.viewAll}
        />
      );
    case "sections.video":
      return (
        <HomeVideoTheater
          title={section.heading || t.videoTitleLine1}
          intro={section.intro || t.videoBody}
          videos={section.videos}
          ctaLabel={t.videoCta}
          ctaHref={`/${locale}/video`}
        />
      );
    case "sections.social-links":
      return null;
    case "sections.contact":
      return (
        <PageSection
          background="surface"
          heading={
            section.heading || section.intro
              ? { title: section.heading ?? "", intro: section.intro ?? undefined }
              : undefined
          }
        >
          <div className={styles["home-contact"]}>
            {section.details.length > 0 ? (
              <div className={styles["home-contact__meta"]}>
                {section.details.map((detail, index) => (
                  <div className={styles["home-contact__row"]} key={`${detail.type}-${index}`}>
                    <h3 className={styles["home-contact__row-title"]}>{detail.type}</h3>
                    <CmsHtml html={detail.valueHtml} />
                  </div>
                ))}
              </div>
            ) : null}
            {section.clinics.length > 0 ? (
              <ul className={styles["home-contact__clinics"]} role="list">
                {section.clinics.map((clinic) => (
                  <li className={styles["home-contact__clinic"]} key={clinic.name}>
                    <h3 className={styles["home-contact__clinic-name"]}>{clinic.name}</h3>
                    <CmsHtml html={clinic.addressHtml} />
                    {clinic.phone ? (
                      <p className={styles["home-contact__phone"]}>{clinic.phone}</p>
                    ) : null}
                    {clinic.email ? (
                      <p>
                        <a className={styles["u-link"]} href={`mailto:${clinic.email}`}>
                          {clinic.email}
                        </a>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </PageSection>
      );
    default:
      return (
        <PageSection
          heading={
            section.heading || section.intro
              ? { title: section.heading ?? "", intro: section.intro ?? undefined }
              : undefined
          }
          rhythm="compact"
        >
          <DefaultSectionRenderer section={section} />
        </PageSection>
      );
  }
}
