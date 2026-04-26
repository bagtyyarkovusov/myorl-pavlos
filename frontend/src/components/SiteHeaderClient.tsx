"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ButtonLink, isExternalHref } from "@/components/design-system";
import { getHeaderStrings } from "@/lib/i18n/header";
import type { GlobalSettingsDTO, Locale, NavigationNodeDTO } from "@/lib/cms/types";

type SiteHeaderClientProps = {
  locale: Locale;
  navigation: NavigationNodeDTO[];
  appointmentHref: string;
  settings: GlobalSettingsDTO | null;
};

const LOCALE_LABELS: Record<Locale, string> = {
  el: "GR",
  ru: "RU",
};

const LOGO_SRC = "/logo-myorl.png";

export function SiteHeaderClient({
  locale,
  navigation,
  appointmentHref,
  settings,
}: SiteHeaderClientProps) {
  const t = getHeaderStrings(locale);
  const address = settings?.address ?? t.address;
  const phoneTel = settings?.phoneTel ?? t.phoneTel;
  const phoneDisplay = settings?.phoneDisplay ?? t.phoneDisplay;
  const hours = settings?.hours ?? t.hours;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [pillStyle, setPillStyle] = useState({ width: 0, left: 0, opacity: 0 });
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const activeId = hoveredId || openMenuId;

  useEffect(() => {
    if (!activeId || !navRef.current) {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const nav = navRef.current;
    const el = nav.querySelector(`[data-id="${activeId}"]`) as HTMLElement | null;
    if (el) {
      setPillStyle({
        width: el.offsetWidth,
        left: el.offsetLeft,
        opacity: 1,
      });
    } else {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeId]);

  const activeMenu = useMemo(
    () => (openMenuId ? (navigation.find((n) => n.documentId === openMenuId) ?? null) : null),
    [openMenuId, navigation],
  );

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        openButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  return (
    <>
      <div className="site-utility" data-locale={locale}>
        <div className="container site-utility__inner">
          <div className="site-utility__group">
            <span>
              <span className="status-dot" aria-hidden="true" /> {address}
            </span>
            <span className="desktop-only">{hours}</span>
          </div>
          <div className="site-utility__group">
            <a className="u-link" href={`tel:${phoneTel}`}>
              {phoneDisplay}
            </a>
            <LocaleSwitcher locale={locale} languageLabel={t.languageLabel} />
          </div>
        </div>
      </div>

      <header className="site-header" data-locale={locale}>
        <div className="container site-header__inner">
          <Link className="brand" href={`/${locale}`} aria-label={t.brandLogoAlt}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="brand-logo"
              src={LOGO_SRC}
              alt={t.brandLogoAlt}
              width={64}
              height={64}
            />
          </Link>

          <div className="megamenu-host" onMouseLeave={() => setOpenMenuId(null)}>
            <nav
              className="desktop-nav"
              aria-label={t.primaryNavLabel}
              ref={navRef}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className="nav-magnetic-pill"
                style={{
                  width: pillStyle.width,
                  transform: `translateX(${pillStyle.left}px)`,
                  opacity: pillStyle.opacity,
                }}
                aria-hidden="true"
              />
              {navigation.map((item) => (
                <DesktopNavigationItem
                  key={item.documentId}
                  item={item}
                  isOpen={openMenuId === item.documentId}
                  onHover={() => setHoveredId(item.documentId)}
                  onActivate={() =>
                    setOpenMenuId(item.children.length > 0 ? item.documentId : null)
                  }
                  onClose={() => setOpenMenuId(null)}
                />
              ))}
            </nav>
            <div
              className="megamenu-panel"
              data-open={activeMenu !== null}
              aria-hidden={activeMenu === null}
            >
              <div className="megamenu-panel__surface">
                {activeMenu ? <MegaMenuContent item={activeMenu} locale={locale} /> : null}
              </div>
            </div>
          </div>

          <div className="header-actions">
            <ButtonLink className="cta-book desktop-only" href={appointmentHref}>
              <span className="cta-book__full">{t.bookAppointment}</span>
              <span className="cta-book__short" aria-hidden="true">
                {t.bookAppointmentShort}
              </span>
            </ButtonLink>
            <button
              ref={openButtonRef}
              className="icon-button mobile-only"
              type="button"
              aria-label={t.openMenu}
              aria-expanded={drawerOpen}
              aria-controls="mobile-navigation"
              onClick={() => setDrawerOpen(true)}
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <div
        className={`mobile-drawer ${drawerOpen ? "is-open" : ""}`}
        data-locale={locale}
        aria-hidden={!drawerOpen}
      >
        <button
          className="mobile-drawer__backdrop"
          type="button"
          aria-label={t.closeMenu}
          onClick={() => {
            setDrawerOpen(false);
            openButtonRef.current?.focus();
          }}
        />
        <aside
          id="mobile-navigation"
          className="mobile-drawer__panel"
          aria-label={t.mobileNavLabel}
        >
          <div className="mobile-drawer__head">
            <Link
              className="brand brand--mobile"
              href={`/${locale}`}
              aria-label={t.brandLogoAlt}
              onClick={() => setDrawerOpen(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="brand-logo brand-logo--mobile"
                src={LOGO_SRC}
                alt={t.brandLogoAlt}
                width={64}
                height={64}
              />
            </Link>
            <button
              ref={closeButtonRef}
              className="icon-button"
              type="button"
              aria-label={t.closeMenu}
              onClick={() => {
                setDrawerOpen(false);
                openButtonRef.current?.focus();
              }}
            >
              ×
            </button>
          </div>
          <nav className="mobile-drawer__body" aria-label={t.mobileNavInnerLabel}>
            {navigation.map((item) => (
              <MobileNavigationItem
                key={item.documentId}
                item={item}
                locale={locale}
                onNavigate={() => setDrawerOpen(false)}
              />
            ))}
          </nav>
          <div className="mobile-drawer__foot">
            <ButtonLink href={appointmentHref}>{t.bookAppointment}</ButtonLink>
          </div>
        </aside>
      </div>
    </>
  );
}

function DesktopNavigationItem({
  item,
  isOpen,
  onActivate,
  onClose,
  onHover,
}: {
  item: NavigationNodeDTO;
  isOpen: boolean;
  onActivate: () => void;
  onClose: () => void;
  onHover: () => void;
}) {
  if (item.children.length === 0) {
    return (
      <div className="nav-item" data-id={item.documentId} onMouseEnter={onHover}>
        <NavigationAnchor
          className="nav-link"
          item={item}
          onMouseEnter={onActivate}
          onFocus={onActivate}
        />
      </div>
    );
  }

  return (
    <div
      className={`nav-item ${isOpen ? "is-open" : ""}`}
      data-id={item.documentId}
      onMouseEnter={() => {
        onHover();
        onActivate();
      }}
    >
      <button
        className="nav-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => (isOpen ? onClose() : onActivate())}
        onFocus={onActivate}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
      >
        {item.navLabel}
        <span className="nav-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
    </div>
  );
}

function MegaMenuContent({ item, locale }: { item: NavigationNodeDTO; locale: Locale }) {
  const t = getHeaderStrings(locale);
  const featureBlurb = item.excerpt?.trim() || t.sectionOverviewBlurb(item.title);
  return (
    <div className="nav-panel__grid">
      <div className="nav-panel__feature">
        <p className="eyebrow">{item.title}</p>
        <h2>{item.navLabel}</h2>
        <p>{featureBlurb}</p>
        <NavigationAnchor className="nav-panel__cta" item={item}>
          {t.sectionOverviewLink}
          <span className="cta-arrow" aria-hidden="true">
            →
          </span>
        </NavigationAnchor>
      </div>
      <div className="nav-panel__links">
        {item.children.slice(0, 12).map((child, index) => {
          const meta = leafMetaLabel(child, t);
          return (
            <div
              key={child.documentId}
              className="nav-panel__link-wrapper"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <NavigationAnchor item={child}>
                <span className="title">{child.navLabel}</span>
                {meta ? <span className="meta">{meta}</span> : null}
              </NavigationAnchor>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function leafMetaLabel(
  child: NavigationNodeDTO,
  t: ReturnType<typeof getHeaderStrings>,
): string | null {
  if (child.children.length > 0) {
    return t.topicsLabel(child.children.length);
  }
  const excerpt = child.excerpt?.trim();
  if (excerpt) {
    return excerpt;
  }
  if (child.title && child.title.trim() !== child.navLabel.trim()) {
    return child.title;
  }
  return null;
}

function MobileNavigationItem({
  item,
  locale,
  onNavigate,
}: {
  item: NavigationNodeDTO;
  locale: Locale;
  onNavigate: () => void;
}) {
  const t = getHeaderStrings(locale);

  if (item.children.length === 0) {
    return (
      <NavigationAnchor className="nav-link" item={item} onClick={onNavigate}>
        {item.navLabel}
      </NavigationAnchor>
    );
  }

  return (
    <details>
      <summary>
        <span>
          <span>{item.navLabel}</span>
          <span className="brand-meta">{item.title}</span>
        </span>
        <span className="summary-plus" aria-hidden="true">
          +
        </span>
      </summary>
      <div className="mobile-subnav">
        <NavigationAnchor item={item} onClick={onNavigate}>
          {t.overviewMobile}
        </NavigationAnchor>
        {item.children.map((child) => (
          <NavigationAnchor key={child.documentId} item={child} onClick={onNavigate}>
            {child.navLabel}
          </NavigationAnchor>
        ))}
      </div>
    </details>
  );
}

function NavigationAnchor({
  item,
  children,
  className,
  onClick,
  onMouseEnter,
  onFocus,
}: {
  item: NavigationNodeDTO;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
}) {
  if (isExternalHref(item.href)) {
    return (
      <a
        className={className}
        href={item.href}
        rel="noreferrer"
        target="_blank"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onFocus={onFocus}
      >
        {children ?? item.navLabel}
      </a>
    );
  }

  return (
    <Link
      className={className}
      href={item.href}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
    >
      {children ?? item.navLabel}
    </Link>
  );
}

function LocaleSwitcher({ locale, languageLabel }: { locale: Locale; languageLabel: string }) {
  const locales = Object.keys(LOCALE_LABELS) as Locale[];

  return (
    <div className="locale-switcher" aria-label={languageLabel}>
      {locales.map((item) => (
        <Link
          key={item}
          href={`/${item}`}
          hrefLang={item}
          aria-current={item === locale ? "page" : undefined}
        >
          {LOCALE_LABELS[item]}
        </Link>
      ))}
    </div>
  );
}
