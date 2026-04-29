import Link from "next/link";

import { isExternalHref } from "@/components/design-system";
import { cn } from "@/lib/utils";

import styles from "../../SiteHeaderClient.module.css";

type CTAButtonProps = {
  href: string;
  fullLabel: string;
  shortLabel: string;
};

export function CTAButton({ href, fullLabel, shortLabel }: CTAButtonProps) {
  const className = cn(styles["cta-book"], "desktop-only");

  if (isExternalHref(href)) {
    return (
      <a className={className} href={href} rel="noreferrer" target="_blank">
        <span className={styles["cta-book__full"]}>{fullLabel}</span>
        <span className={styles["cta-book__short"]} aria-hidden="true">
          {shortLabel}
        </span>
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      <span className={styles["cta-book__full"]}>{fullLabel}</span>
      <span className={styles["cta-book__short"]} aria-hidden="true">
        {shortLabel}
      </span>
    </Link>
  );
}
