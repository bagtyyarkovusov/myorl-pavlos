import { type NextRequest, NextResponse } from "next/server";

const LOCALES = ["el", "ru"] as const;
const DEFAULT_LOCALE = "el";

const PUBLIC_FILE = /\.(.*)$/;

function getLocaleFromAcceptLanguage(request: NextRequest): string {
  const header = request.headers.get("accept-language");
  if (!header) return DEFAULT_LOCALE;

  const preferred = header
    .split(",")
    .map((entry) => {
      const parts = entry.trim().split(";q=");
      const lang = parts[0]?.split("-")[0]?.toLowerCase() ?? "";
      const q = parseFloat(parts[1] ?? "1");
      return { lang, q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of preferred) {
    if (LOCALES.includes(lang as (typeof LOCALES)[number])) {
      return lang;
    }
  }

  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminToken) {
      return NextResponse.json(
        { error: "ADMIN_TOKEN is not configured" },
        { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
      );
    }

    const authHeader = request.headers.get("authorization");
    const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
    const token = bearerMatch?.[1]?.trim();

    if (!token || token !== adminToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
      );
    }

    return NextResponse.next();
  }

  if (
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return;
  }

  const segments = pathname.split("/").filter(Boolean);
  const locale: string | undefined = segments[0];

  if (locale && (LOCALES as readonly string[]).includes(locale)) {
    return;
  }

  // Root redirect: / → /<detected-locale>
  // 308 Permanent per ADR-013 — Canonical Home is /el.
  // Bare slugs (e.g. /amygdales) are handled by next.config.ts redirects()
  // as a wildcard → /el/:slug (308). Passthrough here so the framework-level
  // redirect rules process them.
  if (pathname === "/") {
    const detected = getLocaleFromAcceptLanguage(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${detected}`;
    return NextResponse.redirect(url, 308);
  }
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|sitemap.xml|robots.txt).*)"],
};
