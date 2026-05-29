"use client";

import Image from "next/image";
import Link from "next/link";

import { useRef } from "react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { GlobalSettingsDTO, Locale, NavigationNodeDTO } from "@/lib/cms/types";
import { PrimaryContactPhones } from "@/components/PrimaryContactPhones";

import { MobileMenu } from "./MobileMenu";
import drawerStyles from "./MobileDrawer.module.css";
import sharedStyles from "../../SiteHeaderClient.module.css";

const styles = new Proxy({} as Record<string, string>, {
  get(_, key: string) {
    return drawerStyles[key] ?? sharedStyles[key];
  },
});

const LOGO_SRC = "/logo-myorl.png";

type MobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  items: NavigationNodeDTO[];
  locale: Locale;
  appointmentHref: string;
  address: string | null;
  settings: GlobalSettingsDTO;
  closeMenuLabel: string;
  brandLogoAlt: string;
  mobileNavLabel: string;
  mobileNavInnerLabel: string;
  overviewMobile: string;
  topicsLabel: (count: number) => string;
  bookAppointmentLabel: string;
};

export function MobileDrawer({
  isOpen,
  onClose,
  closeButtonRef,
  items,
  locale,
  appointmentHref,
  address,
  settings,
  closeMenuLabel,
  brandLogoAlt,
  mobileNavLabel,
  mobileNavInnerLabel,
  overviewMobile,
  topicsLabel,
  bookAppointmentLabel,
}: MobileDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(panelRef, isOpen, { restoreFocus: false });

  return (
    <div
      className={`${styles["mobile-drawer"]} ${isOpen ? styles["is-open"] : ""}`}
      data-state={isOpen ? "open" : "closed"}
      data-locale={locale}
      aria-hidden={!isOpen}
    >
      <button
        className={styles["mobile-drawer__backdrop"]}
        type="button"
        aria-label={closeMenuLabel}
        onClick={onClose}
      />

      <aside
        ref={panelRef}
        id="mobile-navigation"
        className={styles["mobile-drawer__panel"]}
        aria-label={mobileNavLabel}
      >
        <div className={styles["mobile-drawer__head"]}>
          <Link
            className={styles.brand}
            href={`/${locale}`}
            aria-label={brandLogoAlt}
            onClick={onClose}
          >
            <Image
              className={`${styles["brand-logo"]} ${styles["brand-logo--mobile"]}`}
              src={LOGO_SRC}
              alt={brandLogoAlt}
              width={64}
              height={64}
            />
          </Link>

          <button
            ref={closeButtonRef}
            className={`${styles.hamburger} ${styles["is-active"]}`}
            type="button"
            aria-label={closeMenuLabel}
            onClick={onClose}
          >
            <span className={styles["hamburger__line"]} />
            <span className={styles["hamburger__line"]} />
            <span className={styles["hamburger__line"]} />
          </button>
        </div>

        <nav className={styles["mobile-drawer__body"]} aria-label={mobileNavInnerLabel}>
          <MobileMenu
            items={items}
            overviewMobile={overviewMobile}
            topicsLabel={topicsLabel}
            onNavigate={onClose}
          />
        </nav>

        <div className={styles["mobile-drawer__info"]}>
          {address ? (
            <div className={styles["mobile-drawer__info-item"]}>
              <span className={styles["status-dot"]} aria-hidden="true" />
              <span>{address}</span>
            </div>
          ) : null}
          <div className={styles["mobile-drawer__info-item"]}>
            <span className={styles["mobile-drawer__info-icon"]} aria-hidden="true">
              &#9742;
            </span>
            <PrimaryContactPhones
              locale={locale}
              settings={settings}
              className={styles["mobile-drawer__phones"]}
              linkClassName={styles["u-link"]}
              separatorClassName={styles["mobile-drawer__phone-separator"]}
            />
          </div>
        </div>

        <div className={styles["mobile-drawer__foot"]}>
          <Link href={appointmentHref} onClick={onClose}>
            <span className={styles["cta-book__label"]}>{bookAppointmentLabel}</span>
            <span className={styles["cta-book__arrow"]} aria-hidden="true">
              <svg viewBox="0 0 16 16" width="16" height="16" focusable="false">
                <path
                  d="M3.5 8h7.5M8.5 4.5 12 8l-3.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        </div>
      </aside>
    </div>
  );
}
