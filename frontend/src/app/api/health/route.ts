import { NextResponse } from "next/server";

import { getCmsConfig } from "@/lib/cms/env";

export async function GET() {
  const config = getCmsConfig();
  const healthUrl = new URL(`${config.strapiUrl}/api/pages`);
  healthUrl.searchParams.set("pagination[pageSize]", "1");
  healthUrl.searchParams.set("fields[0]", "documentId");

  try {
    const response = await fetch(healthUrl, {
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
