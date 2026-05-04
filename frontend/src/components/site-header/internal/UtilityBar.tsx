import type { Locale } from "@/lib/cms/types";

import { LocaleSwitcher } from "./LocaleSwitcher";
import styles from "../../SiteHeaderClient.module.css";

type UtilityBarProps = {
  address: string;
  hours: string;
  phoneTel: string;
  phoneDisplay: string;
  locale: Locale;
  languageLabel: string;
};

export function UtilityBar({
  address,
  hours,
  phoneTel,
  phoneDisplay,
  locale,
  languageLabel,
}: UtilityBarProps) {
  return (
    <div className={styles["site-utility"]} data-locale={locale}>
      <div className={`container ${styles["site-utility__inner"]}`}>
        <div className={styles["site-utility__group"]}>
          <span className={styles["site-utility__address-line"]}>
            <span className={styles["status-dot"]} aria-hidden="true" />
            <span className={styles["site-utility__address"]}>{address}</span>
          </span>
          <span className="desktop-only">{hours}</span>
        </div>
        <div className={styles["site-utility__group"]}>
          <a
            className={`${styles["u-link"]} ${styles["site-utility__phone"]}`}
            href={`tel:${phoneTel}`}
          >
            {phoneDisplay}
          </a>
          <LocaleSwitcher locale={locale} languageLabel={languageLabel} />
        </div>
      </div>
    </div>
  );
}
