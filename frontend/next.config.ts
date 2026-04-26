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

function loadSlugRedirects(): NextRedirect[] {
  const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
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
  async redirects() {
    return loadSlugRedirects();
  },
};

export default nextConfig;
