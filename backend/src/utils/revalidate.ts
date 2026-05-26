/**
 * POSTs tag-based revalidation to the Next.js /api/revalidate endpoint.
 *
 * Configure via NEXT_REVALIDATE_URL and REVALIDATE_SECRET env vars.
 * Failures are logged to the console but never thrown — content mutations
 * must not be blocked by a revalidation error.
 */

const REVALIDATE_TIMEOUT_MS = 10_000;

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export async function notifyRevalidation(tags: string[]): Promise<void> {
  const url = env("NEXT_REVALIDATE_URL");
  const secret = env("REVALIDATE_SECRET");

  if (!url || !secret) {
    if (!url) console.warn("[revalidate] NEXT_REVALIDATE_URL is not set; skipping");
    if (!secret) console.warn("[revalidate] REVALIDATE_SECRET is not set; skipping");
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
