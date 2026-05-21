import Image from "next/image";
import Link from "next/link";

import { CmsHtml } from "@/components/CmsHtml";
import type { Density } from "@/lib/cms/density";
import type { MediaDTO } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

import styles from "./design-system.module.css";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
};

const BUTTON_LINK_BASE_CLASSES =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold whitespace-nowrap transition-all duration-150 ease hover:-translate-y-px focus-visible:-translate-y-px";

const BUTTON_LINK_VARIANT_CLASSES: Record<NonNullable<ButtonLinkProps["variant"]>, string> = {
  primary: "border-transparent bg-ink !text-bone-50 hover:bg-trust focus-visible:bg-trust",
  secondary:
    "border-ink/20 bg-transparent !text-ink hover:border-trust hover:bg-trust-soft hover:!text-trust-ink focus-visible:border-trust focus-visible:bg-trust-soft focus-visible:!text-trust-ink",
};

export function ButtonLink({ href, children, variant = "primary", className }: ButtonLinkProps) {
  const classes = cn(BUTTON_LINK_BASE_CLASSES, BUTTON_LINK_VARIANT_CLASSES[variant], className);

  if (isExternalHref(href)) {
    return (
      <a className={classes} href={href} rel="noreferrer" target="_blank">
        {children}
      </a>
    );
  }

  return (
    <Link className={classes} href={href}>
      {children}
    </Link>
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  action?: React.ReactNode;
};

export function SectionHeading({ eyebrow, title, intro, action }: SectionHeadingProps) {
  return (
    <div className={styles["section-heading"]}>
      <div>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {action ?? (intro ? <p>{intro}</p> : null)}
    </div>
  );
}

type MediaFrameProps = {
  media?: MediaDTO | null;
  alt?: string;
  label?: string;
  variant?: "portrait" | "wide" | "band";
  eager?: boolean;
  className?: string;
  /** Overrides the default `sizes` hint for `next/image` (layout-specific breakpoints). */
  sizes?: string;
};

export function MediaFrame({
  media,
  alt = "",
  label,
  variant = "wide",
  eager = false,
  className,
  sizes: sizesProp,
}: MediaFrameProps) {
  const frameClass = cn(
    styles["media-frame"],
    styles[`media-frame--${variant}`],
    !media?.url && styles["ph-stripe"],
    className,
  );

  const defaultSizes =
    variant === "portrait"
      ? "(min-width: 960px) 36vw, 100vw"
      : variant === "band"
        ? "(min-width: 960px) 28rem, 92vw"
        : "(min-width: 960px) 44vw, 100vw";

  return (
    <div className={frameClass}>
      {media?.url ? (
        <Image
          src={media.url}
          alt={alt || media.alternativeText || ""}
          fill
          sizes={sizesProp ?? defaultSizes}
          loading={eager ? "eager" : undefined}
          fetchPriority={eager ? "high" : undefined}
        />
      ) : null}
      {label ? (
        <span className={cn(styles["media-frame__label"], styles["ph-label"])}>{label}</span>
      ) : null}
    </div>
  );
}

type CardProps = {
  title?: string | null;
  description?: string | null;
  href?: string | null;
  image?: MediaDTO | null;
  imageAlt?: string;
  density?: Density;
  ctaLabel?: string;
  className?: string;
};

export function Card({
  title,
  description,
  href,
  image,
  imageAlt,
  density = "focused",
  ctaLabel,
  className,
}: CardProps) {
  const resolvedTitle = title?.trim() || "Resource";
  const linkHref = href || "#";
  const showCta = density !== "scanning" && ctaLabel;

  return (
    <article
      className={cn(styles.card, styles[`card--${density}`], className)}
      data-card
      data-density={density}
    >
      {image?.url ? (
        <div className={styles.card__media}>
          <Image
            src={image.url}
            alt={imageAlt || image.alternativeText || resolvedTitle}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </div>
      ) : null}
      <div className={styles.card__body}>
        <h3 className={styles.card__title}>
          <Link className={styles.card__link} href={linkHref}>
            {resolvedTitle}
          </Link>
        </h3>
        <CmsHtml className={styles.card__description} html={description} />
        {showCta ? <span className={styles.card__cta}>{ctaLabel}</span> : null}
      </div>
    </article>
  );
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
