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
  event?: string;
  model?: string;
  uid?: string;
  entry?: Record<string, unknown>;
  media?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const config = getCmsConfig();
  const payload = await parsePayload(request);
  const providedSecret = resolveProvidedSecret(
    payload,
    request.nextUrl.searchParams.get("secret"),
    request.headers.get("authorization"),
  );

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

export function resolveProvidedSecret(
  payload: RevalidatePayload,
  querySecret: string | null,
  authorizationHeader: string | null,
): string | undefined {
  return querySecret ?? payload.secret ?? readBearerSecret(authorizationHeader);
}

export function readBearerSecret(header: string | null): string | undefined {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || undefined;
}

export function deriveTags(payload: RevalidatePayload): string[] {
  if (Array.isArray(payload.tags) && payload.tags.length > 0) {
    return [...new Set(payload.tags.filter(Boolean))];
  }

  const strapiTags = deriveStrapiWebhookTags(payload);
  if (strapiTags) {
    return strapiTags;
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

function deriveStrapiWebhookTags(payload: RevalidatePayload): string[] | null {
  if (!payload.event) {
    return null;
  }

  if (payload.event.startsWith("media.")) {
    return ["pages", "sitemap"];
  }

  if (!payload.event.startsWith("entry.")) {
    return null;
  }

  const model = payload.model ?? payload.uid;
  const locale = stringValue(payload.entry?.locale);
  const documentId = stringValue(payload.entry?.documentId);

  if (isPageModel(model)) {
    const tags = new Set<string>(["pages", "sitemap"]);
    const slug = stringValue(payload.entry?.slug);

    if (locale) {
      tags.add(`navigation:${locale}`);
      tags.add(`locale:${locale}`);
    }
    if (locale && slug) {
      tags.add(`page:${locale}:${slug}`);
    }
    if (documentId) {
      tags.add(`page:${documentId}`);
    }

    return [...tags];
  }

  if (isVideoEntryModel(model)) {
    const tags = new Set<string>(["pages", "sitemap"]);
    if (locale) {
      tags.add(`locale:${locale}`);
    }
    if (documentId) {
      tags.add(`video:${documentId}`);
    }
    return [...tags];
  }

  if (isGlobalModel(model)) {
    const tags = new Set<string>(["pages", "sitemap"]);
    if (locale) {
      tags.add(`global:${locale}`);
      tags.add(`locale:${locale}`);
    }
    return [...tags];
  }

  if (isTagModel(model)) {
    const tags = new Set<string>(["tags", "pages", "sitemap"]);
    if (locale) {
      tags.add(`locale:${locale}`);
    }
    return [...tags];
  }

  return ["pages", "sitemap"];
}

function isVideoEntryModel(model: string | undefined): boolean {
  return model === "api::video-entry.video-entry" || model === "video-entry";
}

function isGlobalModel(model: string | undefined): boolean {
  return model === "api::global.global" || model === "global";
}

function isPageModel(model: string | undefined): boolean {
  return model === "api::page.page" || model === "page";
}

function isTagModel(model: string | undefined): boolean {
  return model === "api::tag.tag" || model === "tag";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
