import { type NextRequest, NextResponse } from "next/server";

import gonePaths from "../../data/gone-paths.json";

const LOCALES = ["el", "ru"] as const;
const DEFAULT_LOCALE = "el";

const GONE_PATHS = new Set(gonePaths as string[]);

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

  if (GONE_PATHS.has(pathname)) {
    return new NextResponse(gonePageHtml(), {
      status: 410,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const segments = pathname.split("/").filter(Boolean);
  const locale: string | undefined = segments[0];

  if (locale && (LOCALES as readonly string[]).includes(locale)) {
    return;
  }

  // Root → /<detected-locale>, 308 permanent (ADR-013).
  // Bare slugs pass through — handled by next.config.ts redirects().
  if (pathname === "/") {
    const detected = getLocaleFromAcceptLanguage(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${detected}`;
    return NextResponse.redirect(url, 308);
  }
}

function gonePageHtml(): string {
  return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page gone</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 600px; margin: 80px auto; padding: 0 20px; color: #333; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  p { color: #666; margin-bottom: 1.5rem; }
  form { display: flex; gap: 8px; max-width: 400px; }
  input { flex: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem; }
  button { padding: 8px 16px; border: none; border-radius: 4px; background: #1a1a2e; color: #fff; font-weight: 600; cursor: pointer; }
  nav { margin-top: 2rem; display: flex; gap: 12px; }
  nav a { color: #1a1a2e; }
</style>
</head>
<body>
<p style="color:#999; font-size:0.85rem;">410</p>
<h1>Page gone</h1>
<p>The page you are looking for has been permanently removed.</p>
<form role="search" action="/el/search-results" method="get">
  <input type="search" name="q" placeholder="Search myorl.gr" required>
  <button type="submit">Search</button>
</form>
<nav aria-label="home pages">
  <a href="/el">Αρχική (Ελληνικά)</a>
  <a href="/ru">Главная (Русский)</a>
</nav>
</body>
</html>`;
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|sitemap.xml|robots.txt).*)"],
};
