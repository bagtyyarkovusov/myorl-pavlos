import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PageDTO } from "@/lib/cms/types";

const addDocuments = vi.fn();
const deleteDocument = vi.fn();
const index = vi.fn(() => ({ addDocuments, deleteDocument }));
const getMeiliAdminClient = vi.fn(() => ({ index }));
const getPageByDocumentIdResult = vi.fn();

function enqueuedTask(status: "succeeded" | "failed" = "succeeded") {
  const taskPromise = Promise.resolve({ taskUid: 1 }) as Promise<{ taskUid: number }> & {
    waitTask: ReturnType<typeof vi.fn>;
  };
  taskPromise.waitTask = vi
    .fn()
    .mockResolvedValue(
      status === "succeeded"
        ? { status: "succeeded" }
        : { status: "failed", error: { message: "Meili task failed" } },
    );
  return taskPromise;
}

vi.mock("@/lib/search/meili-client", () => ({
  getMeiliAdminClient,
  indexNameForLocale: (locale: "el" | "ru") => locale,
  isSearchEnabled: () => process.env.SEARCH_ENABLED !== "false",
}));

vi.mock("@/lib/cms/cms-api", () => ({
  getPageByDocumentIdResult,
}));

function makePage(overrides: Partial<PageDTO> = {}): PageDTO {
  return {
    documentId: "abc123xy",
    locale: "el",
    slug: "about",
    title: "About Us",
    navLabel: "About Us",
    pageType: "content",
    layoutVariant: "standard",
    renderMode: "cms",
    seo: {
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
      ogImage: null,
      schemaType: null,
      robotsNoindex: false,
      robotsNofollow: false,
      sitemapExclude: false,
      sitemapPriority: null,
      sitemapChangeFrequency: null,
    },
    seoTitle: "About Us",
    content: "<p>Body text</p>",
    excerpt: "Excerpt",
    featuredImage: null,
    imageCenter: null,
    externalUrl: null,
    isFolder: false,
    hideFromMenu: false,
    menuIndex: 0,
    footerCategory: "none",
    parentPage: null,
    relatedPages: [],
    relatedTopics: [],
    tags: [],
    alternateUrls: { el: "/el/about" },
    sections: [],
    ...overrides,
  };
}

function signedRequest(payload: unknown, secret = "test-webhook-secret"): Request {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  return new Request("http://localhost/api/search/reindex", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-signature": signature,
    },
    body,
  });
}

describe("POST /api/search/reindex", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SEARCH_ENABLED", "true");
    vi.stubEnv("STRAPI_WEBHOOK_SECRET", "test-webhook-secret");
    getMeiliAdminClient.mockReturnValue({ index });
    getPageByDocumentIdResult.mockResolvedValue({ ok: true, page: makePage() });
    addDocuments.mockReturnValue(enqueuedTask());
    deleteDocument.mockReturnValue(enqueuedTask());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("upserts one Page Search Document into the locale Search Index", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      signedRequest({ contentType: "page", id: "abc123xy", locale: "el", action: "upsert" }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, action: "upsert", id: "page:abc123xy", index: "el" });
    expect(getPageByDocumentIdResult).toHaveBeenCalledWith("el", "abc123xy");
    expect(index).toHaveBeenCalledWith("el");
    expect(addDocuments).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          documentKey: "page_abc123xy",
          id: "page:abc123xy",
          type: "page",
          locale: "el",
        }),
      ],
      { primaryKey: "documentKey" },
    );
    expect(addDocuments.mock.results[0]?.value.waitTask).toHaveBeenCalledWith({
      timeout: 5000,
      interval: 50,
    });
  });

  it("deletes one Page Search Document from the locale Search Index", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      signedRequest({ contentType: "page", id: "abc123xy", locale: "el", action: "delete" }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, action: "delete", id: "page:abc123xy", index: "el" });
    expect(deleteDocument).toHaveBeenCalledWith("page_abc123xy");
    expect(deleteDocument.mock.results[0]?.value.waitTask).toHaveBeenCalledWith({
      timeout: 5000,
      interval: 50,
    });
    expect(getPageByDocumentIdResult).not.toHaveBeenCalled();
  });

  it("waits for the skipped-system delete task before returning", async () => {
    getPageByDocumentIdResult.mockResolvedValue({
      ok: true,
      page: makePage({
        pageType: "content",
        layoutVariant: "appointment-form",
      }),
    });
    const { POST } = await import("./route");

    const response = await POST(
      signedRequest({ contentType: "page", id: "abc123xy", locale: "el", action: "upsert" }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, skipped: true, id: "page:abc123xy", index: "el" });
    expect(deleteDocument).toHaveBeenCalledWith("page_abc123xy");
    expect(deleteDocument.mock.results[0]?.value.waitTask).toHaveBeenCalledWith({
      timeout: 5000,
      interval: 50,
    });
  });

  it("does not return a successful upsert response when the Meili task fails", async () => {
    addDocuments.mockReturnValue(enqueuedTask("failed"));
    const { POST } = await import("./route");

    const response = await POST(
      signedRequest({ contentType: "page", id: "abc123xy", locale: "el", action: "upsert" }),
    );

    expect(response.status).not.toBe(200);
  });

  it("returns degraded when a Meili write fails before task enqueue", async () => {
    addDocuments.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const { POST } = await import("./route");

    const response = await POST(
      signedRequest({ contentType: "page", id: "abc123xy", locale: "el", action: "upsert" }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, degraded: true });
  });

  it("rejects missing payload fields", async () => {
    const { POST } = await import("./route");

    const response = await POST(signedRequest({ contentType: "page", id: "abc123xy" }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(addDocuments).not.toHaveBeenCalled();
  });

  it("returns a no-op response when search is disabled", async () => {
    vi.stubEnv("SEARCH_ENABLED", "false");
    const { POST } = await import("./route");

    const response = await POST(
      signedRequest({ contentType: "page", id: "abc123xy", locale: "el", action: "upsert" }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, noop: true });
    expect(getMeiliAdminClient).not.toHaveBeenCalled();
  });

  it("rejects invalid HMAC signatures", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({
      contentType: "page",
      id: "abc123xy",
      locale: "el",
      action: "upsert",
    });

    const response = await POST(
      new Request("http://localhost/api/search/reindex", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-signature": "invalid",
        },
        body,
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ ok: false, error: "Invalid webhook signature." });
    expect(addDocuments).not.toHaveBeenCalled();
  });
});
