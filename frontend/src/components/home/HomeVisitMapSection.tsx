import Link from "next/link";

import {
  mapEmbedSrcFromAddress,
  resolveContactEmail,
  resolvePhoneDisplay,
  resolvePhoneTel,
  resolveVisitAddressBlock,
  resolveVisitHours,
} from "@/lib/site/contact-fallbacks";
import { getHomeStrings } from "@/lib/i18n/home";
import type { GlobalSettingsDTO, Locale } from "@/lib/cms/types";

import styles from "./HomeVisitMapSection.module.css";

type HomeVisitMapSectionProps = {
  locale: Locale;
  settings: GlobalSettingsDTO;
  appointmentHref: string;
};

export function HomeVisitMapSection({ locale, settings, appointmentHref }: HomeVisitMapSectionProps) {
  const t = getHomeStrings(locale);
  const addressBlock = resolveVisitAddressBlock(settings, locale);
  const hours = resolveVisitHours(settings, locale);
  const phoneDisplay = resolvePhoneDisplay(settings);
  const phoneTel = resolvePhoneTel(settings);
  const email = resolveContactEmail();
  const mapSrc = mapEmbedSrcFromAddress(addressBlock);
  const contactHref = `/${locale}/epikoinonia`;

  return (
    <section className={styles["section"]} aria-labelledby="home-visit-heading">
      <div className={`container ${styles["inner"]}`}>
        <div className={styles["grid"]}>
          <div>
            <p className={styles["eyebrow"]}>{t.visitMapEyebrow}</p>
            <h2 id="home-visit-heading" className={styles["title"]}>
              {t.visitMapTitleBefore}{" "}
              <em className={styles["title-accent"]}>{t.visitMapTitleAccent}</em>
              {t.visitMapTitleAfter ? <> {t.visitMapTitleAfter}</> : null}
            </h2>
            <p className={styles["lead"]}>{t.visitMapLead}</p>
          </div>

          <div className={styles["right-col"]}>
            <div className={styles["cards-row"]}>
              <Link href={appointmentHref} className={styles["card"]}>
                <div className={styles["card-top"]}>
                  <span className={styles["card-label"]}>{t.visitMapCardClinicLabel}</span>
                  <span className={styles["card-dot"]} aria-hidden="true" />
                </div>
                <h3 className={styles["card-title"]}>{t.visitMapCardClinicTitle}</h3>
                <p className={styles["card-body"]}>{t.visitMapCardClinicBody}</p>
                <div className={styles["card-cta"]}>{t.visitMapCardClinicCta}</div>
              </Link>

              <Link href={contactHref} className={styles["card"]}>
                <div className={styles["card-top"]}>
                  <span className={styles["card-label"]}>{t.visitMapCardOnlineLabel}</span>
                  <span className={styles["card-dot"]} aria-hidden="true" />
                </div>
                <h3 className={styles["card-title"]}>{t.visitMapCardOnlineTitle}</h3>
                <p className={styles["card-body"]}>{t.visitMapCardOnlineBody}</p>
                <div className={styles["card-cta"]}>{t.visitMapCardOnlineCta}</div>
              </Link>
            </div>

            <div className={styles["meta"]}>
              <div>
                <div className={styles["meta-label"]}>{t.visitMapLabelAddress}</div>
                <p className={styles["meta-value"]}>{addressBlock}</p>
              </div>
              <div>
                <div className={styles["meta-label"]}>{t.visitMapLabelHours}</div>
                <p className={styles["meta-value"]}>{hours}</p>
              </div>
              <div>
                <div className={styles["meta-label"]}>{t.visitMapLabelDirect}</div>
                <p className={styles["meta-value"]}>
                  <a className={styles["tel"]} href={`tel:${phoneTel}`}>
                    {phoneDisplay}
                  </a>
                  {"\n"}
                  <a href={`mailto:${email}`}>{email}</a>
                </p>
              </div>
            </div>

            <div className={styles["map-wrap"]}>
              <iframe
                className={styles["map"]}
                title={t.visitMapMapTitle}
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
