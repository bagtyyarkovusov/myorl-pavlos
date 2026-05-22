"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getMobileActionStrings } from "@/lib/i18n/mobile-actions";
import { resolveMobileCallTel } from "@/lib/site/contact-fallbacks";
import type { GlobalSettingsDTO, Locale } from "@/lib/cms/types";

import styles from "./MobileActionDock.module.css";

const SHOW_SCROLL_THRESHOLD_PX = 480;

type MobileActionDockProps = {
  locale: Locale;
  settings: GlobalSettingsDTO;
  contactHref: string;
};

export function MobileActionDock({ locale, settings, contactHref }: MobileActionDockProps) {
  const t = getMobileActionStrings(locale);
  const callTel = resolveMobileCallTel(settings);
  const [scrollVisible, setScrollVisible] = useState(false);
  const [atFooter, setAtFooter] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrollVisible(window.scrollY > SHOW_SCROLL_THRESHOLD_PX);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const footer = document.querySelector("footer.site-footer");
    if (!footer) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setAtFooter(entry?.isIntersecting ?? false);
      },
      {
        root: null,
        rootMargin: "0px 0px -72px 0px",
        threshold: 0,
      },
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  function handleScrollToTop() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  if (!callTel && !contactHref) {
    return null;
  }

  return (
    <nav
      className={`${styles.dock} ${atFooter ? styles["dock--at-footer"] : ""}`}
      aria-label={t.dockNavLabel}
    >
      <div className={styles["fab-group"]}>
        {callTel ? (
          <a
            className={`${styles.fab} ${styles["fab--call"]}`}
            href={`tel:${callTel}`}
            aria-label={t.callLabel}
          >
            <PhoneIcon />
          </a>
        ) : null}
        {contactHref ? (
          <Link
            className={`${styles.fab} ${styles["fab--contact"]}`}
            href={contactHref}
            aria-label={t.contactLabel}
          >
            <MailIcon />
          </Link>
        ) : null}
      </div>

      <button
        type="button"
        className={`${styles.fab} ${styles["fab--scroll"]} ${scrollVisible ? styles["is-visible"] : ""}`}
        onClick={handleScrollToTop}
        aria-label={t.scrollToTopLabel}
        aria-hidden={!scrollVisible}
        tabIndex={scrollVisible ? 0 : -1}
      >
        <ArrowUpIcon />
      </button>
    </nav>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m22 8-10 6L2 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 19V5M5 12l7-7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
