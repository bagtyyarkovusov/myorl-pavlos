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

  const detected = getLocaleFromAcceptLanguage(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${detected}${pathname === "/" ? "" : pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|sitemap.xml|robots.txt).*)"],
};
