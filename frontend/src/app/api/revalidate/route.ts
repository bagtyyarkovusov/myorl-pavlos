import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getCmsConfig } from "@/lib/cms/env";

type RevalidatePayload = {
  secret?: string;
  type?: "page" | "navigation" | "tag" | "all";
  locale?: string;
  slug?: string;
  documentId?: string;
  tags?: string[];
};

export async function POST(request: NextRequest) {
  const config = getCmsConfig();
  const payload = await parsePayload(request);
  const providedSecret = request.nextUrl.searchParams.get("secret") ?? payload.secret;

  if (!config.revalidateSecret) {
    return NextResponse.json(
      { ok: false, error: "Revalidation secret is not configured." },
      { status: 503 },
    );
  }

  if (providedSecret !== config.revalidateSecret) {
    return NextResponse.json({ ok: false, error: "Invalid revalidation secret." }, { status: 401 });
  }

  const tags = deriveTags(payload);
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }

  return NextResponse.json({ ok: true, tags });
}

async function parsePayload(request: NextRequest): Promise<RevalidatePayload> {
  try {
    return (await request.json()) as RevalidatePayload;
  } catch {
    return {};
  }
}

function deriveTags(payload: RevalidatePayload): string[] {
  if (Array.isArray(payload.tags) && payload.tags.length > 0) {
    return [...new Set(payload.tags.filter(Boolean))];
  }

  const tags = new Set<string>(["pages"]);
  if (payload.type === "all") {
    tags.add("navigation");
    tags.add("tags");
    tags.add("sitemap");
  }
  if (payload.type === "tag") {
    tags.add("tags");
  }
  if (payload.type === "navigation" && payload.locale) {
    tags.add(`navigation:${payload.locale}`);
  }
  if (payload.type === "page") {
    if (payload.locale && payload.slug) {
      tags.add(`page:${payload.locale}:${payload.slug}`);
      tags.add(`navigation:${payload.locale}`);
    }
    if (payload.documentId) {
      tags.add(`page:${payload.documentId}`);
    }
    tags.add("sitemap");
  }

  return [...tags];
}
