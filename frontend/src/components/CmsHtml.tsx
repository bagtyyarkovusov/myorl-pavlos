import { sanitizeCmsHtml } from "@/lib/html";
import { cn } from "@/lib/utils";

type CmsHtmlProps = {
  html?: string | null;
  className?: string;
  variant?: "luxury" | "service" | "encyclopedia" | "specialized";
};

const PROSE_VARIANT_CLASSES: Record<NonNullable<CmsHtmlProps["variant"]>, string | null> = {
  luxury: null,
  service: "prose-service",
  encyclopedia: "prose-encyclopedia",
  specialized: "prose-specialized",
};

export function CmsHtml({ html, className, variant = "luxury" }: CmsHtmlProps) {
  const sanitized = sanitizeCmsHtml(html);

  if (!sanitized.trim()) {
    return null;
  }

  return (
    <div
      className={cn("cms-html prose-luxury", PROSE_VARIANT_CLASSES[variant], className)}
      data-variant={variant === "luxury" ? undefined : variant}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
