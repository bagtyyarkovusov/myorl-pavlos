"use client";

import Image from "next/image";
import Link from "next/link";

import { useRef } from "react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { Locale, NavigationNodeDTO } from "@/lib/cms/types";

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
  address: string;
  hours: string;
  phoneTel: string;
  phoneDisplay: string;
  closeMenuLabel: string;
  brandLogoAlt: string;
  mobileNavLabel: string;
  mobileNavInnerLabel: string;
  overviewMobile: string;
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
  hours,
  phoneTel,
  phoneDisplay,
  closeMenuLabel,
  brandLogoAlt,
  mobileNavLabel,
  mobileNavInnerLabel,
  overviewMobile,
  bookAppointmentLabel,
}: MobileDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(panelRef, isOpen, { restoreFocus: false });
  const staggerBase = items.length + 1;

  return (
    <div
      className={`${styles["mobile-drawer"]} ${isOpen ? styles["is-open"] : ""}`}
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
          <MobileMenu items={items} overviewMobile={overviewMobile} onNavigate={onClose} />
        </nav>

        <div
          className={`${styles["mobile-drawer__info"]} ${styles["mobile-stagger-item"]}`}
          style={{ "--stagger-index": staggerBase } as React.CSSProperties}
        >
          <div className={styles["mobile-drawer__info-item"]}>
            <span className={styles["status-dot"]} aria-hidden="true" />
            <span>{address}</span>
          </div>
          <div className={styles["mobile-drawer__info-item"]}>
            <span className={styles["mobile-drawer__info-icon"]} aria-hidden="true">
              &#9742;
            </span>
            <a className={styles["u-link"]} href={`tel:${phoneTel}`}>
              {phoneDisplay}
            </a>
          </div>
          <div className={styles["mobile-drawer__info-item"]}>
            <span className={styles["mobile-drawer__info-icon"]} aria-hidden="true">
              &#128338;
            </span>
            <span>{hours}</span>
          </div>
        </div>

        <div
          className={`${styles["mobile-drawer__foot"]} ${styles["mobile-stagger-item"]}`}
          style={{ "--stagger-index": staggerBase + 1 } as React.CSSProperties}
        >
          <Link href={appointmentHref} onClick={onClose}>
            {bookAppointmentLabel}
          </Link>
        </div>
      </aside>
    </div>
  );
}
