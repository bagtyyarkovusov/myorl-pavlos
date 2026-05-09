import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
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

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

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

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: frontendRoot,
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
    return [
      ...manifestRedirects,
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
