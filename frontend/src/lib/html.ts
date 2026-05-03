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
];

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
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      const existingRel = node.getAttribute("rel") ?? "";
      const tokens = new Set(existingRel.split(/\s+/).filter(Boolean));
      tokens.add("noopener");
      tokens.add("noreferrer");
      node.setAttribute("rel", Array.from(tokens).join(" "));
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

export function sanitizeCmsHtml(html: string | null | undefined): string {
  if (!html) {
    return "";
  }
  registerHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["style", "script", "font"],
    FORBID_ATTR: ["style", "class"],
  });
}
