import { sanitizeCmsHtml } from "@/lib/html";
import { cn } from "@/lib/utils";

type CmsHtmlProps = {
  html?: string | null;
  className?: string;
};

export function CmsHtml({ html, className }: CmsHtmlProps) {
  const sanitized = sanitizeCmsHtml(html);

  if (!sanitized.trim()) {
    return null;
  }

  return (
    <div
      className={cn("cms-html prose-luxury", className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
