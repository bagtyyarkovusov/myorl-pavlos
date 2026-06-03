import { sanitizeCmsHtml } from "@/lib/html";
import { getPageStrings } from "@/lib/i18n/page";
import type { Locale } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

import { CmsHtmlEnhancer } from "@/components/cms/CmsHtmlEnhancer";

type CmsHtmlProps = {
  html?: string | null;
  className?: string;
  variant?: "luxury" | "service" | "encyclopedia" | "specialized" | "dense";
  /** Localized LiteYouTube play control label. Defaults to Greek when omitted. */
  playLabel?: string;
  locale?: Locale;
};

const PROSE_VARIANT_CLASSES: Record<NonNullable<CmsHtmlProps["variant"]>, string | null> = {
  luxury: null,
  service: "prose-service",
  encyclopedia: "prose-encyclopedia",
  specialized: "prose-specialized",
  dense: "prose-dense",
};

export function CmsHtml({
  html,
  className,
  variant = "luxury",
  playLabel,
  locale = "el",
}: CmsHtmlProps) {
  const sanitized = sanitizeCmsHtml(html);

  if (!sanitized.trim()) {
    return null;
  }

  const resolvedPlayLabel = playLabel ?? getPageStrings(locale).videoPlayLabel;

  return (
    <CmsHtmlEnhancer
      key={sanitized}
      html={sanitized}
      className={cn("cms-html prose-luxury", PROSE_VARIANT_CLASSES[variant], className)}
      data-variant={variant === "luxury" ? undefined : variant}
      lang={locale}
      playLabel={resolvedPlayLabel}
    />
  );
}
