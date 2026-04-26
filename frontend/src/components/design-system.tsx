import Image from "next/image";
import Link from "next/link";

import type { MediaDTO } from "@/lib/cms/types";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
};

export function ButtonLink({ href, children, variant = "primary", className }: ButtonLinkProps) {
  const classes = [
    "button-link",
    variant === "secondary" ? "button-link--secondary" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

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
    <div className="section-heading">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
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
  variant?: "portrait" | "wide";
  priority?: boolean;
};

export function MediaFrame({
  media,
  alt = "",
  label,
  variant = "wide",
  priority = false,
}: MediaFrameProps) {
  const className = `media-frame media-frame--${variant} ${media?.url ? "" : "ph-stripe"}`;

  return (
    <div className={className}>
      {media?.url ? (
        <Image
          src={media.url}
          alt={alt || media.alternativeText || ""}
          fill
          sizes={
            variant === "portrait"
              ? "(min-width: 960px) 36vw, 100vw"
              : "(min-width: 960px) 44vw, 100vw"
          }
          priority={priority}
          unoptimized
        />
      ) : null}
      {label ? <span className="media-frame__label ph-label">{label}</span> : null}
    </div>
  );
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
