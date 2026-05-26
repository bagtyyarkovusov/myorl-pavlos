const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60_000;

const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS,
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  const timestamps = buckets.get(key);
  if (!timestamps) {
    buckets.set(key, [now]);
    return true;
  }

  const recent = timestamps.filter((t) => t > cutoff);

  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }

  recent.push(now);
  buckets.set(key, recent);
  return true;
}

export function clearRateLimitBuckets(): void {
  buckets.clear();
}
