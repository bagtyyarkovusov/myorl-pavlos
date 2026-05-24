import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getPageByDocumentIdResult, getVideoEntryByDocumentIdResult } from "@/lib/cms/cms-api";
import { isLocale, type Locale } from "@/lib/cms/types";
import { indexPageDocument, indexVideoDocument } from "@/lib/search/index-document";
import {
  getMeiliAdminClient,
  indexNameForLocale,
  isSearchEnabled,
} from "@/lib/search/meili-client";

type ReindexPayload = {
  contentType?: unknown;
  id?: unknown;
  locale?: unknown;
  action?: unknown;
  items?: unknown;
};

type ValidReindexPayload = {
  contentType: "page";
  id: string;
  locale: Locale;
  action: "upsert" | "delete";
};

type BulkItem = {
  id: string;
  locale: Locale;
};

type BulkReindexPayload = {
  contentType: "page" | "video";
  items: BulkItem[];
};

class MeiliTaskFailedError extends Error {}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!isSearchEnabled()) {
    return NextResponse.json({ ok: true, noop: true });
  }

  if (!isValidWebhookSignature(rawBody, request.headers.get("x-webhook-signature"))) {
    return NextResponse.json({ ok: false, error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = parsePayload(rawBody);

  // Detect bulk vs single-doc
  if (Array.isArray(payload.items)) {
    return handleBulk(payload);
  }

  const validation = validatePayload(payload);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  return handleSingle(validation.payload);
}

async function handleSingle(body: ValidReindexPayload): Promise<Response> {
  const admin = getMeiliAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: true, degraded: true });
  }

  const indexName = indexNameForLocale(body.locale);
  const index = admin.index(indexName);
  const documentId = "page:" + body.id;
  const documentKey = meiliDocumentKeyForPage(body.id);

  try {
    if (body.action === "delete") {
      await waitForMeiliTask(index.deleteDocument(documentKey));
      return NextResponse.json({ ok: true, action: "delete", id: documentId, index: indexName });
    }

    const pageResult = await getPageByDocumentIdResult(body.locale, body.id);
    if (!pageResult.ok) {
      return NextResponse.json(
        { ok: false, error: pageResult.error.message },
        { status: pageResult.error.kind === "not_found" ? 404 : 502 },
      );
    }

    const document = indexPageDocument(pageResult.page);
    if (!document) {
      await waitForMeiliTask(index.deleteDocument(documentKey));
      return NextResponse.json({ ok: true, skipped: true, id: documentId, index: indexName });
    }

    await waitForMeiliTask(
      index.addDocuments([{ documentKey, ...document }], { primaryKey: "documentKey" }),
    );

    return NextResponse.json({ ok: true, action: "upsert", id: document.id, index: indexName });
  } catch (error) {
    if (error instanceof MeiliTaskFailedError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, degraded: true });
  }
}

async function handleBulk(payload: ReindexPayload): Promise<Response> {
  const bulk = validateBulkPayload(payload);
  if (!bulk.ok) {
    return NextResponse.json({ ok: false, error: bulk.error }, { status: 400 });
  }

  const admin = getMeiliAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: true, degraded: true });
  }

  const { contentType, items } = bulk.payload;
  const indexed: Array<{ id: string; locale: Locale }> = [];
  const skipped: Array<{ id: string; locale: Locale }> = [];
  const errors: Array<{ id: string; error: string }> = [];

  // Fetch and map each item, collecting successes by locale
  const localeDocs = new Map<Locale, Array<Record<string, unknown>>>();

  for (const item of items) {
    try {
      const result = await fetchAndMapItem(contentType, item);
      if (!result) {
        skipped.push({ id: item.id, locale: item.locale });
        continue;
      }
      const { documentKey, searchDoc } = result;
      indexed.push({ id: item.id, locale: item.locale });
      const docs = localeDocs.get(item.locale) ?? [];
      docs.push({ documentKey, ...searchDoc });
      localeDocs.set(item.locale, docs);
    } catch (err) {
      errors.push({
        id: item.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // Batch-add to Meilisearch per locale
  const batchErrors: string[] = [];
  for (const [locale, docs] of localeDocs) {
    try {
      const indexName = indexNameForLocale(locale);
      const index = admin.index(indexName);
      await waitForMeiliTask(index.addDocuments(docs, { primaryKey: "documentKey" }));
    } catch (err) {
      batchErrors.push(locale + ": " + (err instanceof Error ? err.message : "Batch write failed"));
    }
  }

  return NextResponse.json({
    ok: true,
    action: "bulk-upsert",
    indexed: indexed.length,
    skipped: skipped.length,
    errors: [...errors, ...batchErrors.map((e) => ({ id: "batch", error: e }))],
  });
}

async function fetchAndMapItem(
  contentType: "page" | "video",
  item: BulkItem,
): Promise<{ documentKey: string; searchDoc: Record<string, unknown> } | null> {
  if (contentType === "page") {
    const pageResult = await getPageByDocumentIdResult(item.locale, item.id);
    if (!pageResult.ok) {
      return null;
    }
    const document = indexPageDocument(pageResult.page);
    if (!document) {
      return null;
    }
    return {
      documentKey: meiliDocumentKeyForPage(item.id),
      searchDoc: document as unknown as Record<string, unknown>,
    };
  }

  const videoResult = await getVideoEntryByDocumentIdResult(item.locale, item.id);
  if (!videoResult.ok) {
    return null;
  }
  const document = indexVideoDocument(videoResult.video);
  if (!document) {
    return null;
  }
  return {
    documentKey: meiliDocumentKeyForVideo(item.id),
    searchDoc: document as unknown as Record<string, unknown>,
  };
}

function parsePayload(rawBody: string): ReindexPayload {
  try {
    return JSON.parse(rawBody) as ReindexPayload;
  } catch {
    return {};
  }
}

function validatePayload(
  payload: ReindexPayload,
): { ok: true; payload: ValidReindexPayload } | { ok: false; error: string } {
  if (payload.contentType !== "page") {
    return { ok: false, error: "Unsupported content type." };
  }
  if (payload.action !== "upsert" && payload.action !== "delete") {
    return { ok: false, error: "Unsupported action." };
  }
  if (typeof payload.id !== "string" || !payload.id.trim()) {
    return { ok: false, error: "Missing page id." };
  }
  if (typeof payload.locale !== "string" || !isLocale(payload.locale)) {
    return { ok: false, error: "Unsupported locale." };
  }

  return {
    ok: true,
    payload: {
      contentType: payload.contentType,
      id: payload.id,
      locale: payload.locale,
      action: payload.action,
    },
  };
}

function validateBulkPayload(
  payload: ReindexPayload,
): { ok: true; payload: BulkReindexPayload } | { ok: false; error: string } {
  if (payload.contentType !== "page" && payload.contentType !== "video") {
    return { ok: false, error: "Unsupported content type. Supported: page, video." };
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return { ok: false, error: "Missing or empty items array." };
  }

  for (const [index, item] of payload.items.entries()) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: "Item at index " + index + " is not an object." };
    }
    if (typeof item.id !== "string" || !item.id.trim()) {
      return { ok: false, error: "Item at index " + index + " is missing id." };
    }
    if (typeof item.locale !== "string" || !isLocale(item.locale)) {
      return { ok: false, error: "Item at index " + index + " has invalid locale." };
    }
  }

  return {
    ok: true,
    payload: {
      contentType: payload.contentType,
      items: payload.items as BulkItem[],
    },
  };
}

function isValidWebhookSignature(rawBody: string, providedSignature: string | null): boolean {
  const secret = process.env.STRAPI_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }
  if (!providedSignature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(providedSignature, "hex");

  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

function meiliDocumentKeyForPage(documentId: string): string {
  return "page_" + documentId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function meiliDocumentKeyForVideo(documentId: string): string {
  return "video_" + documentId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function waitForMeiliTask(
  taskPromise: Promise<unknown> & {
    waitTask?: (options: { timeout: number; interval: number }) => Promise<unknown>;
  },
): Promise<void> {
  if (typeof taskPromise.waitTask === "function") {
    const result = await taskPromise.waitTask({ timeout: 5000, interval: 50 });
    if (
      result &&
      typeof result === "object" &&
      "status" in result &&
      result.status === "failed" &&
      "error" in result
    ) {
      throw new MeiliTaskFailedError(JSON.stringify(result.error));
    }
    return;
  }

  await taskPromise;
}
