import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "dd",
  "details",
  "dl",
  "dt",
  "div",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "iframe",
  "img",
  "kbd",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "q",
  "s",
  "samp",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "var",
];

const ALLOWED_ATTR = [
  "class",
  "href",
  "title",
  "alt",
  "src",
  "srcset",
  "sizes",
  "loading",
  "decoding",
  "width",
  "height",
  "rel",
  "target",
  "name",
  "id",
  "lang",
  "dir",
  "datetime",
  "colspan",
  "rowspan",
  "scope",
  "allow",
  "allowfullscreen",
  "frameborder",
  "referrerpolicy",
  "data-cms-youtube",
  "data-cms-title",
];

const ALLOWED_CALLOUT_CLASSES = new Set(["callout-teal", "callout-ink", "callout-trust"]);

const YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
]);

const CMS_FIGURE_RE =
  /^(\s*<figure\b[^>]*\bclass="[^"]*\bcms-html__figure\b[^"]*"[^>]*>[\s\S]*?<\/figure>)/i;

/** Layout hooks we add server-side (`cms-html__*`) — keep in sync with globals.css. */
const CMS_HTML_CLASS_PREFIX = "cms-html__";
const ALIGN_CENTER_CLASS = "cms-html__align-center";

function isAllowedCmsHtmlClass(token: string): boolean {
  return token.startsWith(CMS_HTML_CLASS_PREFIX) && /^cms-html__[a-z0-9-]+$/.test(token);
}

const ALLOWED_IFRAME_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "vimeo.com",
  "www.google.com",
  "maps.google.com",
  "www.google.com/maps",
]);

let hooksRegistered = false;

function isElementNode(node: unknown): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as { nodeType?: number }).nodeType === 1 &&
    typeof (node as { getAttribute?: unknown }).getAttribute === "function"
  );
}

function registerHooks(): void {
  if (hooksRegistered) {
    return;
  }
  DOMPurify.removeHooks("uponSanitizeElement");
  DOMPurify.removeHooks("afterSanitizeAttributes");
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName !== "iframe") {
      return;
    }
    if (!isElementNode(node)) {
      return;
    }
    const src = node.getAttribute("src") ?? "";
    if (!isAllowedIframeSrc(src)) {
      node.remove();
    }
  });
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!isElementNode(node)) {
      return;
    }
    const className = node.getAttribute("class");
    if (className) {
      const safeClasses = className
        .split(/\s+/)
        .filter((token) => ALLOWED_CALLOUT_CLASSES.has(token) || isAllowedCmsHtmlClass(token));
      if (safeClasses.length > 0) {
        node.setAttribute("class", safeClasses.join(" "));
      } else {
        node.removeAttribute("class");
      }
    }
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      const existingRel = node.getAttribute("rel") ?? "";
      const tokens = new Set(existingRel.split(/\s+/).filter(Boolean));
      tokens.add("noopener");
      tokens.add("noreferrer");
      node.setAttribute("rel", Array.from(tokens).join(" "));
    }
    if (node.tagName === "IFRAME") {
      const src = node.getAttribute("src") ?? "";
      if (src.startsWith("//")) {
        node.setAttribute("src", `https:${src}`);
      }
    }
  });
  hooksRegistered = true;
}

function isAllowedIframeSrc(src: string): boolean {
  if (!src) {
    return false;
  }
  try {
    const url = new URL(src, "https://placeholder.invalid");
    if (!/^https?:$/.test(url.protocol)) {
      return false;
    }
    return ALLOWED_IFRAME_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function readAttr(tag: string, name: string): string {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(pattern);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Extract a YouTube video id from an embed or watch URL. */
export function extractYoutubeVideoId(src: string): string | null {
  if (!src) {
    return null;
  }
  try {
    const url = new URL(src.startsWith("//") ? `https:${src}` : src, "https://placeholder.invalid");
    if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
      return null;
    }
    const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/i);
    if (embedMatch?.[1]) {
      return embedMatch[1];
    }
    const watchId = url.searchParams.get("v");
    return watchId?.trim() || null;
  } catch {
    return null;
  }
}

function findPrecedingHeadingTitle(html: string, index: number): string | null {
  const before = html.slice(0, index);
  const matches = [...before.matchAll(/<h([2-6])[^>]*>([\s\S]*?)<\/h\1>/gi)];
  if (matches.length === 0) {
    return null;
  }
  const text = stripTags(matches[matches.length - 1]?.[2]).trim();
  return text || null;
}

function buildYoutubeFigure(videoId: string, title: string, centered: boolean): string {
  const classes = ["cms-html__figure", "cms-html__video"];
  if (centered) {
    classes.push("cms-html__align-center");
  }
  const safeTitle = escapeHtmlAttr(title);
  const safeId = escapeHtmlAttr(videoId);
  return `<figure class="${classes.join(" ")}"><div data-cms-youtube="${safeId}" data-cms-title="${safeTitle}"></div></figure>`;
}

function replaceYoutubeIframeMatch(
  html: string,
  full: string,
  offset: number,
  centered: boolean,
): string {
  const srcMatch = full.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const src = (srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? "").trim();
  const videoId = extractYoutubeVideoId(src);
  if (!videoId) {
    return full;
  }
  const iframeTitle = readAttr(full, "title");
  const headingTitle = findPrecedingHeadingTitle(html, offset);
  const title = headingTitle || iframeTitle || "Video";
  return buildYoutubeFigure(videoId, title, centered);
}

/**
 * Replace YouTube iframes with LiteYouTube hydration placeholders.
 * Vimeo, Google Maps, and other allowlisted hosts keep native iframes.
 */
export function replaceYoutubeIframes(html: string): string {
  if (!html.includes("<iframe")) {
    return html;
  }

  let result = html.replace(
    /<p(\s[^>]*)?>\s*(<iframe\b[\s\S]*?<\/iframe>)\s*<\/p>/gi,
    (full, attrs, iframe, offset) => {
      const centered =
        (attrs && /cms-html__align-center/i.test(attrs)) ||
        /\salign=["']center["']/i.test(attrs ?? "") ||
        /text-align\s*:\s*center/i.test(attrs ?? "");
      const replacement = replaceYoutubeIframeMatch(html, iframe, offset, centered);
      if (replacement === iframe) {
        return full;
      }
      return replacement;
    },
  );

  result = result.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, (iframe, offset) => {
    const centered =
      /\salign=["']center["']/i.test(iframe) || /cms-html__align-center/i.test(iframe);
    return replaceYoutubeIframeMatch(result, iframe, offset, centered);
  });

  return result;
}

function wrapFigureRun(figures: string[]): string {
  if (figures.length === 1) {
    return figures[0] ?? "";
  }
  if (figures.length === 2) {
    return `<div class="cms-html__figure-row">${figures.join("")}</div>`;
  }

  let inner = "";
  for (let index = 0; index < figures.length; index += 2) {
    const first = figures[index];
    const second = figures[index + 1];
    if (first && second) {
      inner += `<div class="cms-html__figure-row">${first}${second}</div>`;
    } else if (first) {
      inner += first;
    }
  }
  return `<div class="cms-html__media-stack">${inner}</div>`;
}

/**
 * Group consecutive CMS figures: pairs become two-up rows; longer runs use a media stack.
 */
export function groupConsecutiveFigures(html: string): string {
  if (!html.includes("cms-html__figure")) {
    return html;
  }

  let result = "";
  let remaining = html;

  while (remaining.length > 0) {
    const leadingWhitespace = remaining.match(/^\s+/);
    if (leadingWhitespace) {
      remaining = remaining.slice(leadingWhitespace[0].length);
      continue;
    }

    const figureMatch = remaining.match(CMS_FIGURE_RE);
    if (!figureMatch?.[1]) {
      const nextFigure = remaining.search(/<figure\b[^>]*\bcms-html__figure\b/i);
      if (nextFigure === -1) {
        result += remaining;
        break;
      }
      result += remaining.slice(0, nextFigure);
      remaining = remaining.slice(nextFigure);
      continue;
    }

    const figures: string[] = [];
    while (true) {
      const match = remaining.match(CMS_FIGURE_RE);
      if (!match?.[1]) {
        break;
      }
      figures.push(match[1]);
      remaining = remaining.slice(match[1].length).replace(/^\s+/, "");
    }

    result += wrapFigureRun(figures);
  }

  return result;
}

/** MODX/Bootstrap tab panes wrap article HTML and break `.cms-html` block spacing. */
export function unwrapLegacyWrapperDivs(html: string): string {
  let result = html.trim();
  const tabContentMatch = result.match(
    /^<div\s+class=["']tab-content["'][^>]*>([\s\S]*)<\/div>\s*$/i,
  );
  if (tabContentMatch) {
    result = tabContentMatch[1].trim();
  }
  return result;
}

function addAlignCenterClass(attrs: string): string {
  if (/\bclass=(["'])/i.test(attrs)) {
    return attrs.replace(/\bclass=(["'])([^"']*)\1/i, (_, quote, classes) => {
      const tokens = classes.split(/\s+/).filter(Boolean);
      if (!tokens.includes(ALIGN_CENTER_CLASS)) {
        tokens.push(ALIGN_CENTER_CLASS);
      }
      return `class=${quote}${tokens.join(" ")}${quote}`;
    });
  }
  return `${attrs} class="${ALIGN_CENTER_CLASS}"`;
}

/** Preserve legacy `align` / inline `text-align:center` as a safe layout class before sanitization. */
export function preserveLegacyAlignment(html: string): string {
  return html.replace(/<(p|h[1-6]|div|figure)\b([^>]*)>/gi, (full, tag, attrs) => {
    const hasAlignCenter = /\salign=["']center["']/i.test(attrs);
    const hasTextAlignCenter = /\sstyle=["'][^"']*text-align\s*:\s*center/i.test(attrs);
    if (!hasAlignCenter && !hasTextAlignCenter) {
      return full;
    }

    let nextAttrs = attrs
      .replace(/\salign=["']center["']/gi, "")
      .replace(/\sstyle=["'][^"']*["']/gi, "");
    nextAttrs = addAlignCenterClass(nextAttrs);
    return `<${tag}${nextAttrs}>`;
  });
}

/** Normalise MODX-era markup before DOMPurify strips legacy alignment attributes. */
export function normalizeLegacyCmsMarkup(html: string): string {
  return preserveLegacyAlignment(unwrapLegacyWrapperDivs(html));
}

/**
 * Markdown / WYSIWYG often emits `<p><img></p>`, which inherits paragraph flow and reads
 * poorly on mobile. Normalise to `<figure class="cms-html__figure">` for semantics and layout.
 */
export function upgradeImageOnlyParagraphs(html: string): string {
  if (!html.includes("<img")) {
    return html;
  }
  return html.replace(/<p(\s[^>]*)?>\s*((?:<img\b[^>]*>\s*)+)<\/p>/gi, (_, attrs, imgs) => {
    const classes = ["cms-html__figure"];
    if (attrs && /cms-html__align-center/i.test(attrs)) {
      classes.push("cms-html__align-center");
    }
    return `<figure class="${classes.join(" ")}">${imgs}</figure>`;
  });
}

const BROKEN_IMG_SRC_PATTERN = /^\s*$|^file:|msohtmlclip/i;

function readImgSrc(tag: string): string {
  const match = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function isValidImgSrc(src: string): boolean {
  return src.length > 0 && !BROKEN_IMG_SRC_PATTERN.test(src);
}

/** Remove Word paste artifacts and other `<img>` tags that cannot render. */
export function removeBrokenImages(html: string): string {
  if (!html.includes("<img")) {
    return html;
  }

  let result = html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (/msohtmlclip/i.test(tag)) {
      return "";
    }
    return isValidImgSrc(readImgSrc(tag)) ? tag : "";
  });

  result = result.replace(/<figure class="cms-html__figure">\s*<\/figure>/gi, "");
  result = result.replace(/<p(?:\s[^>]*)?>\s*<\/p>/gi, "");

  return result;
}

export function sanitizeCmsHtml(html: string | null | undefined): string {
  if (!html) {
    return "";
  }
  registerHooks();
  const normalized = normalizeLegacyCmsMarkup(html);
  const sanitized = DOMPurify.sanitize(normalized, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["style", "script", "font"],
    FORBID_ATTR: ["style"],
  });
  const withImages = upgradeImageOnlyParagraphs(removeBrokenImages(sanitized));
  const withVideos = replaceYoutubeIframes(withImages);
  return groupConsecutiveFigures(withVideos);
}

/**
 * Strip all HTML tags and collapse whitespace into a single space.
 * Use for extracting plain-text fallbacks from rich HTML (e.g. map queries).
 */
export function stripTags(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
