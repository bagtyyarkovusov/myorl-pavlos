import { sanitizeCmsHtml } from "@/lib/html";

type CmsHtmlProps = {
  html?: string | null;
  className?: string;
};

export function CmsHtml({ html, className }: CmsHtmlProps) {
  const sanitized = sanitizeCmsHtml(html);

  if (!sanitized.trim()) {
    return null;
  }

  return <div className={className ?? "cms-html"} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
