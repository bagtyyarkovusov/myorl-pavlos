import { CmsHtml } from "@/components/CmsHtml";
import { HomeAdvantagesSection } from "@/components/home/HomeAdvantagesSection";
import { HomeMedicalGrid } from "@/components/home/HomeMedicalGrid";
import { HomeMedicalLedger } from "@/components/home/HomeMedicalLedger";
import { HomePromoCarousel } from "@/components/home/HomePromoCarousel";
import { HomeVideoTheater } from "@/components/home/HomeVideoTheater";
import { getHomeStrings } from "@/lib/i18n/home";
import { toSocialLinkDTO } from "@/lib/cms/dto";
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
      return <HomeAdvantagesSection section={section} />;
    case "sections.linked-resources":
      return (
        <>
          <HomeMedicalLedger
            title={section.heading || t.journalTitleLine1}
            items={section.items}
            locale={locale}
          />
          <HomeMedicalGrid
            title={section.heading ? `${section.heading} (grid)` : t.journalTitleLine1}
            items={section.items}
            locale={locale}
          />
        </>
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
      return (
        <ul
          className={styles["home-social"]}
          role="list"
          aria-label={section.heading ?? "Social media"}
        >
          {section.links
            .map(toSocialLinkDTO)
            .filter((link): link is NonNullable<typeof link> => link !== null)
            .map((link) => (
              <li key={`${link.platform}-${link.url}`}>
                <a
                  href={link.url}
                  rel="noreferrer"
                  target="_blank"
                  className={styles["home-social__link"]}
                >
                  {link.label}
                </a>
              </li>
            ))}
        </ul>
      );
    case "sections.contact":
      return (
        <div className={styles["home-contact"]}>
          {section.details.length > 0 ? (
            <div className={styles["home-contact__meta"]}>
              {section.details.map((detail, index) => (
                <div className={styles["home-contact__row"]} key={`${detail.type}-${index}`}>
                  <h3 className={styles["home-contact__row-title"]}>{detail.type}</h3>
                  <CmsHtml className="cms-html" html={detail.valueHtml} />
                </div>
              ))}
            </div>
          ) : null}
          {section.clinics.length > 0 ? (
            <ul className={styles["home-contact__clinics"]} role="list">
              {section.clinics.map((clinic) => (
                <li className={styles["home-contact__clinic"]} key={clinic.name}>
                  <h3 className={styles["home-contact__clinic-name"]}>{clinic.name}</h3>
                  <CmsHtml className="cms-html" html={clinic.addressHtml} />
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
      );
    default:
      return <DefaultSectionRenderer section={section} />;
  }
}
