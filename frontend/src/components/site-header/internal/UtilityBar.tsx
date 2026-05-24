import type { GlobalSettingsDTO, Locale } from "@/lib/cms/types";
import { PrimaryContactPhones } from "@/components/PrimaryContactPhones";
import { formatUtilityBarHours } from "@/lib/site/contact-fallbacks";

import { LocaleSwitcher } from "./LocaleSwitcher";
import styles from "../../SiteHeaderClient.module.css";

type UtilityBarProps = {
  address: string | null;
  hours: string | null;
  settings: GlobalSettingsDTO;
  locale: Locale;
  languageLabel: string;
  localeUnavailableLabel: string;
};

export function UtilityBar({
  address,
  hours,
  settings,
  locale,
  languageLabel,
  localeUnavailableLabel,
}: UtilityBarProps) {
  const hasContactChrome = Boolean(address || hours || resolveHasPhones(settings));
  const utilityBarHours = formatUtilityBarHours(hours);

  if (!hasContactChrome) {
    return (
      <div className={styles["site-utility"]} data-locale={locale}>
        <div className={`container ${styles["site-utility__inner"]}`}>
          <div className={`${styles["site-utility__zone"]} ${styles["site-utility__zone--end"]}`}>
            <LocaleSwitcher
              locale={locale}
              languageLabel={languageLabel}
              localeUnavailableLabel={localeUnavailableLabel}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["site-utility"]} data-locale={locale}>
      <div className={`container ${styles["site-utility__inner"]}`}>
        <div className={`${styles["site-utility__zone"]} ${styles["site-utility__zone--start"]}`}>
          {address ? (
            <span className={styles["site-utility__address-line"]}>
              <span className={styles["status-dot"]} aria-hidden="true" />
              <span className={styles["site-utility__address"]}>{address}</span>
            </span>
          ) : null}
          {utilityBarHours ? (
            <span className={`desktop-only ${styles["site-utility__hours"]}`}>
              {utilityBarHours}
            </span>
          ) : null}
        </div>

        <div className={`${styles["site-utility__zone"]} ${styles["site-utility__zone--end"]}`}>
          <PrimaryContactPhones
            locale={locale}
            settings={settings}
            className={styles["site-utility__phones"]}
            linkClassName={`${styles["u-link"]} ${styles["site-utility__phone"]}`}
            separatorClassName={styles["site-utility__phone-separator"]}
          />
          <LocaleSwitcher
            locale={locale}
            languageLabel={languageLabel}
            localeUnavailableLabel={localeUnavailableLabel}
          />
        </div>
      </div>
    </div>
  );
}

function resolveHasPhones(settings: GlobalSettingsDTO): boolean {
  return Boolean(
    (settings.phoneTel?.trim() && settings.phoneDisplay?.trim()) ||
    (settings.secondaryPhoneTel?.trim() && settings.secondaryPhoneDisplay?.trim()),
  );
}
