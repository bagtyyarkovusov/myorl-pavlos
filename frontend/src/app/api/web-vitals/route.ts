import { NextResponse } from "next/server";

import { isLocale } from "@/lib/cms/types";
import { logWebVital } from "@/lib/db";
import { checkRateLimit } from "@/lib/search/rate-limiter";
import { UUID_RE } from "@/lib/search/session";

export const maxDuration = 10;

const VALID_METRICS = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);
const VALID_DEVICE_TYPES = new Set(["mobile", "desktop", "tablet"]);

type VitalMetric = {
  metric: string;
  value: number;
  path: string;
  locale: string;
  device_type: string;
  session_id: string;
};

type WebVitalsPayload = {
  metrics: VitalMetric[];
};

function validatePayload(
  body: unknown,
): { ok: true; payload: WebVitalsPayload } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Body must be a JSON object." };
  }

  const raw = body as Record<string, unknown>;

  if (!Array.isArray(raw.metrics)) {
    return { ok: false, error: "metrics must be an array." };
  }

  if (raw.metrics.length === 0) {
    return { ok: false, error: "metrics must not be empty." };
  }

  if (raw.metrics.length > 20) {
    return { ok: false, error: "Too many metrics. Max 20 per request." };
  }

  const metrics: VitalMetric[] = [];

  for (let i = 0; i < raw.metrics.length; i++) {
    const m = (raw.metrics as unknown[])[i];
    if (typeof m !== "object" || m === null) {
      return { ok: false, error: `metrics[${i}] must be an object.` };
    }
    const entry = m as Record<string, unknown>;

    if (typeof entry.metric !== "string" || !VALID_METRICS.has(entry.metric)) {
      return {
        ok: false,
        error: `metrics[${i}].metric must be one of: ${[...VALID_METRICS].join(", ")}.`,
      };
    }

    if (typeof entry.value !== "number" || !isFinite(entry.value) || entry.value < 0) {
      return { ok: false, error: `metrics[${i}].value must be a non-negative finite number.` };
    }

    if (typeof entry.path !== "string" || !entry.path.trim()) {
      return { ok: false, error: `metrics[${i}].path must be a non-empty string.` };
    }

    if (typeof entry.locale !== "string" || !isLocale(entry.locale)) {
      return { ok: false, error: `metrics[${i}].locale must be "el" or "ru".` };
    }

    if (typeof entry.device_type !== "string" || !VALID_DEVICE_TYPES.has(entry.device_type)) {
      return {
        ok: false,
        error: `metrics[${i}].device_type must be one of: ${[...VALID_DEVICE_TYPES].join(", ")}.`,
      };
    }

    if (typeof entry.session_id !== "string" || !UUID_RE.test(entry.session_id)) {
      return { ok: false, error: `metrics[${i}].session_id must be a valid UUID.` };
    }

    metrics.push({
      metric: entry.metric,
      value: entry.value,
      path: entry.path.trim(),
      locale: entry.locale,
      device_type: entry.device_type,
      session_id: entry.session_id,
    });
  }

  return { ok: true, payload: { metrics } };
}

function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  if (firstForwarded) {
    return firstForwarded;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request): Promise<NextResponse> {
  const clientIP = getClientIP(request);
  if (!checkRateLimit(clientIP)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const validation = validatePayload(body);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const { metrics } = validation.payload;

  try {
    for (const m of metrics) {
      await logWebVital(m.metric, m.value, m.path, m.locale, m.device_type, m.session_id);
    }
  } catch {
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
