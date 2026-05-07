import { sanitizeCmsHtml } from "@/lib/html";
import { cn } from "@/lib/utils";

type CmsHtmlProps = {
  html?: string | null;
  className?: string;
  variant?: "luxury" | "service";
};

export function CmsHtml({ html, className, variant = "luxury" }: CmsHtmlProps) {
  const sanitized = sanitizeCmsHtml(html);

  if (!sanitized.trim()) {
    return null;
  }

  return (
    <div
      className={cn("cms-html prose-luxury", variant === "service" && "prose-service", className)}
      data-variant={variant === "luxury" ? undefined : variant}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
