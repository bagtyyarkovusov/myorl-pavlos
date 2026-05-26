export interface RevalidationDeps {
  log?: {
    warn(msg: string): void;
    error(msg: string, err?: unknown): void;
  };
  fetch?: typeof globalThis.fetch;
  baseUrl?: string;
  secret?: string;
}

export function normalizeLegacyPath(path: string): string {
  let normalized = path.trim();
  normalized = normalized.replace(/\/+$/, "");
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Leave as-is if the path contains invalid percent sequences
  }
  return normalized;
}

export function validateLegacyPath(path: string): void {
  if (!path.startsWith("/")) {
    throw new Error("legacyPath must start with /");
  }
}

export function validateDestinationPath(path: string): void {
  if (path.endsWith("/")) {
    throw new Error("destinationPath must not end with /");
  }
}

function normalizeTrailingSlash(path: string): string {
  return path.replace(/\/+$/, "");
}

export async function triggerRevalidation(deps?: RevalidationDeps): Promise<void> {
  const log = deps?.log;
  const fetcher = deps?.fetch ?? globalThis.fetch;
  const baseUrl = deps?.baseUrl ?? process.env.NEXT_REVALIDATE_URL;
  const secret = deps?.secret ?? process.env.REVALIDATE_SECRET;

  if (!baseUrl || !secret) {
    (log ?? console).warn(
      "URL Mapping revalidation skipped: NEXT_REVALIDATE_URL or REVALIDATE_SECRET not set",
    );
    return;
  }

  try {
    const url = `${baseUrl}?secret=${encodeURIComponent(secret)}`;
    const response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: ["url-mappings"] }),
    });

    if (!response.ok) {
      (log ?? console).error(
        `URL Mapping revalidation failed: ${response.status} ${response.statusText}`,
      );
    }
  } catch (err) {
    (log ?? console).error("URL Mapping revalidation request failed", err);
  }
}

function getStrapiLog(): RevalidationDeps["log"] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (globalThis as any).strapi;
    return s?.log ? { warn: (m: string) => s.log.warn(m), error: (m: string, e?: unknown) => s.log.error(m, e) } : undefined;
  } catch {
    return undefined;
  }
}

interface LifecycleEvent {
  params: {
    data?: Record<string, unknown>;
    where?: Record<string, unknown>;
  };
}

function applyNormalization(data: Record<string, unknown>): void {
  const rawLegacyPath = data.legacyPath;
  const rawDestinationPath = data.destinationPath;

  if (typeof rawLegacyPath === "string") {
    const normalized = normalizeLegacyPath(rawLegacyPath);
    validateLegacyPath(normalized);
    data.legacyPath = normalized;
  }
  if (typeof rawDestinationPath === "string") {
    const normalized = normalizeTrailingSlash(rawDestinationPath);
    validateDestinationPath(normalized);
    data.destinationPath = normalized;
  }
}

export default {
  async beforeCreate(event: LifecycleEvent): Promise<void> {
    if (event.params.data) {
      applyNormalization(event.params.data);
    }
  },

  async beforeUpdate(event: LifecycleEvent): Promise<void> {
    if (event.params.data) {
      applyNormalization(event.params.data);
    }
  },

  async afterCreate(): Promise<void> {
    await triggerRevalidation({ log: getStrapiLog() });
  },

  async afterUpdate(): Promise<void> {
    await triggerRevalidation({ log: getStrapiLog() });
  },

  async afterDelete(): Promise<void> {
    await triggerRevalidation({ log: getStrapiLog() });
  },
};
