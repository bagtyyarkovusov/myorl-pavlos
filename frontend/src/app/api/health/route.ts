import { NextResponse } from "next/server";

import { getCmsConfig } from "@/lib/cms/env";

export async function GET() {
  const config = getCmsConfig();

  try {
    const response = await fetch(`${config.strapiUrl}/api/global`, {
      headers: {
        Accept: "application/json",
        ...(config.strapiToken ? { Authorization: `Bearer ${config.strapiToken}` } : {}),
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, strapi: "error", error: `Strapi returned ${response.status}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, strapi: "ok" });
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "TimeoutError"
        ? "Strapi health check timed out after 3s"
        : `Failed to reach Strapi: ${error instanceof Error ? error.message : String(error)}`;

    return NextResponse.json({ ok: false, strapi: "error", error: message }, { status: 502 });
  }
}
