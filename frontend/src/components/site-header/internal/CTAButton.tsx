import Link from "next/link";

import { isExternalHref } from "@/components/design-system";
import { cn } from "@/lib/utils";

import styles from "../../SiteHeaderClient.module.css";

type CTAButtonProps = {
  href: string;
  fullLabel: string;
  shortLabel: string;
};

function CtaArrow() {
  return (
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
  );
}

function CtaLabel({ label }: { label: string }) {
  return (
    <>
      <span className={styles["cta-book__label"]}>{label}</span>
      <CtaArrow />
    </>
  );
}

export function CTAButton({ href, fullLabel, shortLabel }: CTAButtonProps) {
  const className = cn(styles["cta-book"], "desktop-only");

  if (isExternalHref(href)) {
    return (
      <a className={className} href={href} rel="noreferrer" target="_blank">
        <span className={styles["cta-book__full"]}>
          <CtaLabel label={fullLabel} />
        </span>
        <span className={styles["cta-book__short"]} aria-hidden="true">
          <CtaLabel label={shortLabel} />
        </span>
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      <span className={styles["cta-book__full"]}>
        <CtaLabel label={fullLabel} />
      </span>
      <span className={styles["cta-book__short"]} aria-hidden="true">
        <CtaLabel label={shortLabel} />
      </span>
    </Link>
  );
}
