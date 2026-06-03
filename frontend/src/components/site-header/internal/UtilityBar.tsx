import type { GlobalSettingsDTO, Locale } from "@/lib/cms/types";
import { PrimaryContactPhones } from "@/components/PrimaryContactPhones";
import { mapsSearchUrl, resolveTransitNote } from "@/lib/site/contact-fallbacks";

import { LocaleSwitcher } from "./LocaleSwitcher";
import styles from "../../SiteHeaderClient.module.css";

type UtilityBarProps = {
  address: string | null;
  settings: GlobalSettingsDTO;
  locale: Locale;
  languageLabel: string;
  localeUnavailableLabel: string;
};

export function UtilityBar({
  address,
  settings,
  locale,
  languageLabel,
  localeUnavailableLabel,
}: UtilityBarProps) {
  const transitNote = resolveTransitNote(settings);
  const hasContactChrome = Boolean(address || transitNote || resolveHasPhones(settings));

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
              <a
                className={`${styles["u-link"]} ${styles["site-utility__address"]}`}
                href={mapsSearchUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {address}
              </a>
            </span>
          ) : null}
          {transitNote ? (
            <span className={`desktop-only ${styles["site-utility__transit"]}`}>
              <svg
                className={styles["site-utility__transit-icon"]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="6" y="3" width="12" height="13" rx="3" />
                <path d="M6 11h12M8.5 20 7 22M15.5 20 17 22" />
              </svg>
              {transitNote}
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
