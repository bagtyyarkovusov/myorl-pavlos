const SCRIPT_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_ATTR_RE = /\s+on[a-z]+\s*=\s*(["']).*?\1/gi;
const JS_HREF_RE = /\s+href\s*=\s*(["'])\s*javascript:[^"']*\1/gi;
const FONT_TAG_RE = /<\/?font\b[^>]*>/gi;
const STYLE_ATTR_RE = /\s+style\s*=\s*(["']).*?\1/gi;

export function sanitizeCmsHtml(html: string | null | undefined): string {
  return (html ?? "")
    .replace(SCRIPT_RE, "")
    .replace(EVENT_ATTR_RE, "")
    .replace(JS_HREF_RE, "")
    .replace(FONT_TAG_RE, "")
    .replace(STYLE_ATTR_RE, "");
}
