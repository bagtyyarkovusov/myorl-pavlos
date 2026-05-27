import { NextResponse } from "next/server";

import { isLocale } from "@/lib/cms/types";
import { logSearchQuery } from "@/lib/db";
import { checkRateLimit } from "@/lib/search/rate-limiter";
import { UUID_RE } from "@/lib/search/session";

export const maxDuration = 10;

type LogPayload = {
  query: string;
  locale: string;
  result_count: number;
  session_id: string;
};

function validatePayload(
  body: unknown,
): { ok: true; payload: LogPayload } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Body must be a JSON object." };
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.query !== "string" || !raw.query.trim()) {
    return { ok: false, error: "query must be a non-empty string." };
  }

  if (typeof raw.locale !== "string" || !isLocale(raw.locale)) {
    return { ok: false, error: 'locale must be "el" or "ru".' };
  }

  if (
    typeof raw.result_count !== "number" ||
    !Number.isInteger(raw.result_count) ||
    raw.result_count < 0
  ) {
    return { ok: false, error: "result_count must be a non-negative integer." };
  }

  if (typeof raw.session_id !== "string" || !UUID_RE.test(raw.session_id)) {
    return { ok: false, error: "session_id must be a valid UUID." };
  }

  return {
    ok: true,
    payload: {
      query: raw.query.trim(),
      locale: raw.locale,
      result_count: raw.result_count,
      session_id: raw.session_id,
    },
  };
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

  const { query: q, locale, result_count, session_id } = validation.payload;

  try {
    await logSearchQuery(q, locale, result_count, session_id);
  } catch {
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
