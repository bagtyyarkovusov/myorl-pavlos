import type { NextConfig } from "next";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type NextRedirect = {
  source: string;
  destination: string;
  permanent: true;
};

type RedirectManifest = {
  redirects?: Array<{
    fromPathVariants?: string[];
    toPath?: string;
  }>;
};

type StrapiUrlMappingEntity = {
  legacyPath: string;
  destinationPath: string;
  destinationKind: "internal-301" | "external-301" | "gone-410";
  locale?: string | null;
  notes?: string | null;
};

type StrapiUrlMappingResponse = {
  data: StrapiUrlMappingEntity[];
  meta?: { pagination?: { pageCount?: number; total?: number } };
};

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const gonePathsPath = path.resolve(frontendRoot, "..", "data", "gone-paths.json");

function writeGonePaths(gonePaths: string[]): void {
  try {
    mkdirSync(path.dirname(gonePathsPath), { recursive: true });
    writeFileSync(gonePathsPath, JSON.stringify(gonePaths, null, 2) + "\n", "utf-8");
  } catch (err) {
    console.warn(
      "[next.config.ts] Failed to write gone-paths.json:",
      err instanceof Error ? err.message : err,
    );
  }
}

// Static import in proxy.ts requires gone-paths.json to exist at module-load
// time (dev mode compiles proxy.ts before redirects() runs; CI builds without
// STRAPI_URL never enter the success path that writes the file). Seed an empty
// array now so the import resolves; the async path below overwrites with real
// data when Strapi is reachable.
if (!existsSync(gonePathsPath)) {
  writeGonePaths([]);
}

function loadSlugRedirects(): NextRedirect[] {
  const manifestPath = path.resolve(
    frontendRoot,
    "..",
    "data",
    "manifests",
    "slug_redirects_next.json",
  );
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as RedirectManifest;
  const redirects = new Map<string, string>();

  for (const row of manifest.redirects ?? []) {
    if (!row.toPath) {
      continue;
    }
    for (const source of row.fromPathVariants ?? []) {
      if (source && source !== row.toPath) {
        redirects.set(source, row.toPath);
      }
    }
  }

  return Array.from(redirects, ([source, destination]) => ({
    source,
    destination,
    permanent: true,
  }));
}

async function fetchUrlMappings(): Promise<StrapiUrlMappingResponse> {
  const strapiUrl = process.env.STRAPI_URL;
  if (!strapiUrl) {
    throw new Error("STRAPI_URL is not configured");
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.STRAPI_TOKEN) {
    headers.Authorization = "Bearer " + process.env.STRAPI_TOKEN;
  }

  const base = strapiUrl.replace(/\/+$/, "");
  const url = `${base}/api/url-mappings?pagination[pageSize]=1000`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL mappings: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<StrapiUrlMappingResponse>;
}

async function loadUrlMappingRedirects(): Promise<NextRedirect[]> {
  try {
    const data = await fetchUrlMappings();
    const redirects: NextRedirect[] = [];
    const gonePaths: string[] = [];

    for (const entity of data.data ?? []) {
      const kind = entity.destinationKind;
      if (kind === "internal-301" || kind === "external-301") {
        redirects.push({
          source: entity.legacyPath,
          destination: entity.destinationPath,
          permanent: true,
        });
      } else if (kind === "gone-410") {
        gonePaths.push(entity.legacyPath);
      }
    }

    writeGonePaths(gonePaths);

    return redirects;
  } catch (error) {
    console.warn(
      "[next.config.ts] Could not fetch URL mappings — proceeding without dynamic redirects:",
      error instanceof Error ? error.message : error,
    );
    // Still write an empty gone-paths.json so the proxy.ts import resolves
    // even when Strapi is unreachable (e.g., CI Docker build).
    writeGonePaths([]);
    return [];
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Set the Turbopack workspace root to the monorepo, not just frontend/.
    // proxy.ts imports `../../data/gone-paths.json` (generated at build time
    // by loadUrlMappingRedirects below) which lives in the sibling data/
    // directory. With root scoped to frontend/, Turbopack refuses to resolve
    // imports outside it and the build fails with "Module not found".
    root: path.resolve(frontendRoot, ".."),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      // Allow any Railway app subdomain (production + preview deploys)
      {
        protocol: "https",
        hostname: "*.up.railway.app",
        pathname: "/uploads/**",
        search: "",
      },
      // Also allow the explicit STRAPI_URL when available at build time
      {
        protocol: process.env.STRAPI_URL?.startsWith("https") ? "https" : "http",
        hostname: ((): string => {
          try {
            const strapiUrl = process.env.STRAPI_URL;
            if (!strapiUrl) {
              throw new Error("STRAPI_URL environment variable is required");
            }
            return new URL(strapiUrl).hostname;
          } catch {
            return "localhost";
          }
        })(),
        port: ((): string => {
          try {
            const strapiUrl = process.env.STRAPI_URL;
            if (!strapiUrl) return "";
            return new URL(strapiUrl).port;
          } catch {
            return "";
          }
        })(),
        pathname: "/uploads/**",
        search: "",
      },
    ],
  },
  async redirects() {
    const manifestRedirects = loadSlugRedirects();
    const urlMappingRedirects = await loadUrlMappingRedirects();
    return [
      ...manifestRedirects,
      ...urlMappingRedirects,
      {
        source: "/el/contact",
        destination: "/el/epikoinonia",
        permanent: true,
      },
      {
        source: "/el/contact/:path*",
        destination: "/el/epikoinonia/:path*",
        permanent: true,
      },
      {
        source: "/el/kleiste-randevou-online",
        destination: "/el/rantevou",
        permanent: true,
      },
      {
        source: "/ru/kleiste-randevou-online",
        destination: "/ru/zapis",
        permanent: true,
      },
      {
        source: "/el/appointment",
        destination: "/el/rantevou",
        permanent: true,
      },
      {
        source: "/ru/appointment",
        destination: "/ru/zapis",
        permanent: true,
      },
      {
        source: "/:slug((?!el|ru|api|admin|_next|uploads|sitemap.xml|robots.txt|favicon.ico)[^/]+)",
        destination: "/el/:slug",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const strapiUrl = process.env.STRAPI_URL || "http://localhost:1337";
    return [
      {
        source: "/uploads/:path*",
        destination: `${strapiUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
