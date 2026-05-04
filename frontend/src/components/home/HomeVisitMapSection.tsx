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
};

export function HomeVisitMapSection({ locale, settings }: HomeVisitMapSectionProps) {
  const t = getHomeStrings(locale);
  const addressBlock = resolveVisitAddressBlock(settings, locale);
  const hours = resolveVisitHours(settings, locale);
  const phoneDisplay = resolvePhoneDisplay(settings);
  const phoneTel = resolvePhoneTel(settings);
  const email = resolveContactEmail();
  const mapSrc = mapEmbedSrcFromAddress(addressBlock);

  return (
    <section className={styles["section"]} aria-label={t.visitMapSectionLabel}>
      <div className={`container ${styles["inner"]}`}>
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
    </section>
  );
}
