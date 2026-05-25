"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getHeaderStrings } from "@/lib/i18n/header";
import { resolveFooterAddressLine, resolveVisitHours } from "@/lib/site/contact-fallbacks";
import type { GlobalSettingsDTO, Locale, NavigationNodeDTO } from "@/lib/cms/types";

import { DesktopNav } from "./site-header/internal/DesktopNav";
import { MobileDrawer } from "./site-header/internal/MobileDrawer";
import { useDrawer } from "./site-header/internal/useDrawer";
import { useNavigationState } from "./site-header/internal/useNavigationState";
import { usePill } from "./site-header/internal/usePill";
import { UtilityBar } from "./site-header/internal/UtilityBar";
import { CTAButton } from "./site-header/internal/CTAButton";
import { SearchOverlay } from "./search/SearchOverlay";
import styles from "./SiteHeaderClient.module.css";

type SiteHeaderClientProps = {
  locale: Locale;
  navigation: NavigationNodeDTO[];
  appointmentHref: string;
  settings: GlobalSettingsDTO;
};

const LOGO_SRC = "/logo-myorl.png";

export function SiteHeaderClient({
  locale,
  navigation,
  appointmentHref,
  settings,
}: SiteHeaderClientProps) {
  const t = getHeaderStrings(locale);
  const address = resolveFooterAddressLine(settings, locale);
  const hours = resolveVisitHours(settings, locale);

  const {
    isOpen: isDrawerOpen,
    open: openDrawer,
    close: closeDrawer,
    openButtonRef,
    closeButtonRef,
  } = useDrawer();
  const nav = useNavigationState();
  const { pillStyle, registerRect, sync: syncPill } = usePill();

  useEffect(() => {
    syncPill(nav.activeId);
  }, [nav.activeId, syncPill]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const activeMenu = navigation.find((n) => n.documentId === nav.openMenuId) ?? null;
  const featureBlurb = activeMenu
    ? activeMenu.excerpt?.trim() || t.sectionOverviewBlurb(activeMenu.title)
    : "";

  return (
    <>
      <div className={styles["header-anchor"]}>
        <UtilityBar
          address={address}
          hours={hours}
          settings={settings}
          locale={locale}
          languageLabel={t.languageLabel}
          localeUnavailableLabel={t.localeUnavailableLabel}
        />

        <header className={styles["site-header"]} data-locale={locale}>
          <div className={`container ${styles["site-header__inner"]}`}>
            <Link className={styles.brand} href={`/${locale}`} aria-label={t.brandLogoAlt}>
              <Image
                className={styles["brand-logo"]}
                src={LOGO_SRC}
                alt={t.brandLogoAlt}
                width={64}
                height={64}
              />
            </Link>

            <DesktopNav
              items={navigation}
              pillStyle={pillStyle}
              openMenuId={nav.openMenuId}
              onItemHover={nav.setHoveredId}
              onHoverClear={() => nav.setHoveredId(null)}
              onMenuOpen={nav.openMenu}
              onMenuClose={nav.closeMenus}
              registerPillRect={registerRect}
              overviewLinkLabel={t.sectionOverviewLink}
              sectionOverviewMoreHint={t.sectionOverviewMoreHint}
              featureBlurb={featureBlurb}
              primaryNavLabel={t.primaryNavLabel}
              topicsLabel={t.topicsLabel}
            />

            <div className={styles["header-actions"]}>
              <CTAButton
                href={appointmentHref}
                fullLabel={t.bookAppointment}
                shortLabel={t.bookAppointmentShort}
              />
              <button
                type="button"
                className={styles["search-trigger"]}
                aria-label={t.searchLabel}
                aria-expanded={isSearchOpen}
                aria-controls="search-overlay"
                onClick={() => setIsSearchOpen((v) => !v)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
              <button
                ref={openButtonRef}
                className={`${styles.hamburger} ${isDrawerOpen ? styles["is-active"] : ""}`}
                type="button"
                aria-label={t.openMenu}
                aria-expanded={isDrawerOpen}
                aria-controls="mobile-navigation"
                onClick={isDrawerOpen ? closeDrawer : openDrawer}
              >
                <span className={styles["hamburger__line"]} />
                <span className={styles["hamburger__line"]} />
                <span className={styles["hamburger__line"]} />
              </button>
            </div>
          </div>
        </header>
      </div>

      <div className={styles["header-spacer"]} aria-hidden="true">
        <div className={styles["header-spacer__utility"]} />
        <div className={styles["header-spacer__main"]} />
      </div>

      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        closeButtonRef={closeButtonRef}
        items={navigation}
        locale={locale}
        appointmentHref={appointmentHref}
        address={address}
        settings={settings}
        closeMenuLabel={t.closeMenu}
        brandLogoAlt={t.brandLogoAlt}
        mobileNavLabel={t.mobileNavLabel}
        mobileNavInnerLabel={t.mobileNavInnerLabel}
        overviewMobile={t.overviewMobile}
        topicsLabel={t.topicsLabel}
        bookAppointmentLabel={t.bookAppointment}
      />

      <SearchOverlay locale={locale} isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
