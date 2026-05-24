import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getPageByDocumentIdResult } from "@/lib/cms/cms-api";
import { isLocale, type Locale } from "@/lib/cms/types";
import { indexPageDocument } from "@/lib/search/index-document";
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
};

type ValidReindexPayload = {
  contentType: "page";
  id: string;
  locale: Locale;
  action: "upsert" | "delete";
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
  const validation = validatePayload(payload);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const admin = getMeiliAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: true, degraded: true });
  }

  const body = validation.payload;
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
