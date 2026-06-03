import { LiteMap } from "@/components/LiteMap";
import { PrimaryContactPhones } from "@/components/PrimaryContactPhones";
import {
  mapEmbedSrcFromAddress,
  resolveContactEmail,
  resolvePrimaryPhoneLinks,
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
  const email = resolveContactEmail(settings);
  const mapSrc = addressBlock ? mapEmbedSrcFromAddress(addressBlock) : null;

  return (
    <section className={styles["section"]} aria-label={t.visitMapSectionLabel}>
      <div className={styles["inner"]}>
        <div className={styles["meta"]}>
          {addressBlock ? (
            <div>
              <div className={styles["meta-label"]}>{t.visitMapLabelAddress}</div>
              <p className={styles["meta-value"]}>{addressBlock}</p>
            </div>
          ) : null}
          {hours ? (
            <div>
              <div className={styles["meta-label"]}>{t.visitMapLabelHours}</div>
              <p className={styles["meta-value"]}>{hours}</p>
            </div>
          ) : null}
          {email || resolvePrimaryPhoneLinks(settings).length > 0 ? (
            <div>
              <div className={styles["meta-label"]}>{t.visitMapLabelDirect}</div>
              <p className={styles["meta-value"]}>
                <PrimaryContactPhones
                  locale={locale}
                  settings={settings}
                  className={styles["phones"]}
                  linkClassName={styles["tel"]}
                  separatorClassName={styles["phone-separator"]}
                />
                {email ? (
                  <a className={styles["email"]} href={`mailto:${email}`}>
                    {email}
                  </a>
                ) : null}
              </p>
            </div>
          ) : null}
        </div>

        {mapSrc ? (
          <div className={styles["map-wrap"]}>
            <LiteMap
              src={mapSrc}
              title={t.visitMapMapTitle}
              loadLabel={t.visitMapShowLabel}
              hint={addressBlock}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
