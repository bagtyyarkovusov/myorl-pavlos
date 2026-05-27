/**
 * POSTs tag-based revalidation to the Next.js /api/revalidate endpoint.
 *
 * Configure via NEXT_REVALIDATE_URL and STRAPI_REVALIDATE_SECRET env vars.
 * The secret name matches the value Next.js reads in lib/cms/env.ts so the
 * same value can be set once in Railway and propagated to both services.
 * Failures are logged to the console but never thrown — content mutations
 * must not be blocked by a revalidation error.
 */

const REVALIDATE_TIMEOUT_MS = 10_000;

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function createLifecycleHandlers(
  tagsFn: (event: any) => string[],
): {
  afterCreate(event: any): Promise<void>;
  afterUpdate(event: any): Promise<void>;
  afterDelete(event: any): Promise<void>;
} {
  const handler = async (event: any) => {
    await notifyRevalidation(tagsFn(event));
  };
  return { afterCreate: handler, afterUpdate: handler, afterDelete: handler };
}

export async function notifyRevalidation(tags: string[]): Promise<void> {
  const url = env("NEXT_REVALIDATE_URL");
  const secret = env("STRAPI_REVALIDATE_SECRET");

  if (!url || !secret) {
    if (!url) console.warn("[revalidate] NEXT_REVALIDATE_URL is not set; skipping");
    if (!secret) console.warn("[revalidate] STRAPI_REVALIDATE_SECRET is not set; skipping");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVALIDATE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, tags }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(
        `[revalidate] POST ${url} returned ${response.status} ${response.statusText}`,
      );
    } else {
      console.info(`[revalidate] revalidated tags: ${tags.join(", ")}`);
    }
  } catch (err) {
    console.warn(`[revalidate] POST ${url} failed: ${String(err)}`);
  } finally {
    clearTimeout(timeout);
  }
}
