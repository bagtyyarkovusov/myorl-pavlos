import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PageDTO } from "@/lib/cms/types";

const addDocuments = vi.fn();
const deleteDocument = vi.fn();
const updateSynonyms = vi.fn();
const updateStopWords = vi.fn();
const index = vi.fn(() => ({ addDocuments, deleteDocument, updateSynonyms, updateStopWords }));
const getMeiliAdminClient = vi.fn(() => ({ index }));
const getPageByDocumentIdResult = vi.fn();
const getVideoEntryByDocumentIdResult = vi.fn();

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
  getVideoEntryByDocumentIdResult,
}));

const loadSynonymsAndStopWords = vi.fn();

vi.mock("@/lib/search/synonyms", () => ({
  loadSynonymsAndStopWords,
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
    disclaimerOverride: "default",
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

function makeVideoEntry(overrides: Record<string, unknown> = {}) {
  return {
    documentId: "video789xy",
    locale: "el",
    title: "Rhinoplasty Recovery",
    youtubeId: "dQw4w9WgXcQ",
    categories: [{ slug: "rhinoplasty", label: "Rhinoplasty" }],
    sortOrder: 1,
    relatedArticle: null,
    legacyArticleUrl: null,
    ...overrides,
  };
}

function signedRequestForBulk(payload: unknown, secret = "test-webhook-secret"): Request {
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

describe("POST /api/search/reindex - bulk mode", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SEARCH_ENABLED", "true");
    vi.stubEnv("STRAPI_WEBHOOK_SECRET", "test-webhook-secret");
    getMeiliAdminClient.mockReturnValue({ index });
    addDocuments.mockReturnValue(enqueuedTask());
    deleteDocument.mockReturnValue(enqueuedTask());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("bulk upserts Pages across locales", async () => {
    getPageByDocumentIdResult.mockImplementation((locale: string, id: string) =>
      Promise.resolve({
        ok: true,
        page: makePage({
          documentId: id,
          locale: locale as "el" | "ru",
          title: "Page " + id,
        }),
      }),
    );
    const { POST } = await import("./route");

    const response = await POST(
      signedRequestForBulk({
        contentType: "page",
        items: [
          { id: "page001", locale: "el" },
          { id: "page002", locale: "ru" },
          { id: "page003", locale: "el" },
        ],
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      action: "bulk-upsert",
      indexed: 3,
      skipped: 0,
      errors: [],
    });
    expect(getPageByDocumentIdResult).toHaveBeenCalledTimes(3);
    expect(index).toHaveBeenCalledWith("el");
    expect(index).toHaveBeenCalledWith("ru");
    expect(addDocuments).toHaveBeenCalledTimes(2);
    // Verify waitTask was called
    expect(addDocuments.mock.results[0]?.value.waitTask).toHaveBeenCalledWith({
      timeout: 5000,
      interval: 50,
    });
  });

  it("bulk upserts including Video Entries", async () => {
    getPageByDocumentIdResult.mockResolvedValue({ ok: true, page: makePage() });
    getVideoEntryByDocumentIdResult.mockResolvedValue({ ok: true, video: makeVideoEntry() });
    const { POST } = await import("./route");

    const response = await POST(
      signedRequestForBulk({
        contentType: "video",
        items: [
          { id: "vid001", locale: "el" },
          { id: "vid002", locale: "ru" },
        ],
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      action: "bulk-upsert",
      indexed: 2,
      skipped: 0,
      errors: [],
    });
    expect(getVideoEntryByDocumentIdResult).toHaveBeenCalledTimes(2);
    expect(addDocuments).toHaveBeenCalledTimes(2);
  });

  it("handles partial failures gracefully", async () => {
    getPageByDocumentIdResult.mockImplementation((locale: string, id: string) => {
      if (id === "bad-id") {
        return Promise.resolve({ ok: false, error: { kind: "not_found", message: "Not found" } });
      }
      return Promise.resolve({ ok: true, page: makePage({ documentId: id }) });
    });
    const { POST } = await import("./route");

    const response = await POST(
      signedRequestForBulk({
        contentType: "page",
        items: [
          { id: "good-id", locale: "el" },
          { id: "bad-id", locale: "el" },
        ],
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.indexed).toBe(1);
    expect(json.skipped).toBe(1);
    expect(json.errors).toEqual([]);
  });

  it("rejects bulk with empty items array", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      signedRequestForBulk({
        contentType: "page",
        items: [],
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Missing or empty items array." });
    expect(addDocuments).not.toHaveBeenCalled();
  });

  it("rejects bulk with invalid content type", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      signedRequestForBulk({
        contentType: "article",
        items: [{ id: "x", locale: "el" }],
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Unsupported content type. Supported: page, video." });
  });

  it("rejects bulk items with missing id", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      signedRequestForBulk({
        contentType: "page",
        items: [{ locale: "el" }],
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toContain("missing id");
  });
});

function strapiSignedRequest(payload: unknown, secret = "test-webhook-secret"): Request {
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

describe("POST /api/search/reindex - Strapi webhooks", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SEARCH_ENABLED", "true");
    vi.stubEnv("STRAPI_WEBHOOK_SECRET", "test-webhook-secret");
    getMeiliAdminClient.mockReturnValue({ index });
    getPageByDocumentIdResult.mockResolvedValue({ ok: true, page: makePage() });
    getVideoEntryByDocumentIdResult.mockResolvedValue({ ok: true, video: makeVideoEntry() });
    addDocuments.mockReturnValue(enqueuedTask());
    deleteDocument.mockReturnValue(enqueuedTask());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("handles entry.create with publishedAt by upserting", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      strapiSignedRequest({
        event: "entry.create",
        model: "page",
        entry: { documentId: "abc123xy", locale: "el", publishedAt: "2024-01-01T00:00:00.000Z" },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      action: "upsert",
      id: "page:abc123xy",
      locale: "el",
      index: "el",
    });
    expect(getPageByDocumentIdResult).toHaveBeenCalledWith("el", "abc123xy");
    expect(addDocuments).toHaveBeenCalledWith(
      [expect.objectContaining({ documentKey: "page_abc123xy" })],
      { primaryKey: "documentKey" },
    );
    expect(deleteDocument).not.toHaveBeenCalled();
  });

  it("handles entry.update with publishedAt by upserting", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      strapiSignedRequest({
        event: "entry.update",
        model: "page",
        entry: { documentId: "abc123xy", locale: "el", publishedAt: "2024-01-01T00:00:00.000Z" },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ ok: true, action: "upsert" });
    expect(getPageByDocumentIdResult).toHaveBeenCalledWith("el", "abc123xy");
  });

  it("handles entry.update with publishedAt:null by unpublishing", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      strapiSignedRequest({
        event: "entry.update",
        model: "page",
        entry: { documentId: "abc123xy", locale: "el", publishedAt: null },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      action: "unpublish",
      id: "abc123xy",
      locale: "el",
      index: "el",
    });
    expect(deleteDocument).toHaveBeenCalledWith("page_abc123xy");
    expect(addDocuments).not.toHaveBeenCalled();
    expect(getPageByDocumentIdResult).not.toHaveBeenCalled();
  });

  it("handles entry.delete by removing from index", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      strapiSignedRequest({
        event: "entry.delete",
        model: "page",
        entry: { documentId: "abc123xy", locale: "el", publishedAt: "2024-01-01T00:00:00.000Z" },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      action: "delete",
      id: "abc123xy",
      locale: "el",
      index: "el",
    });
    expect(deleteDocument).toHaveBeenCalledWith("page_abc123xy");
    expect(addDocuments).not.toHaveBeenCalled();
    expect(getPageByDocumentIdResult).not.toHaveBeenCalled();
  });

  it("deletes only from the specified locale index", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      strapiSignedRequest({
        event: "entry.delete",
        model: "page",
        entry: { documentId: "abc123xy", locale: "ru", publishedAt: "2024-01-01T00:00:00.000Z" },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      action: "delete",
      id: "abc123xy",
      locale: "ru",
      index: "ru",
    });
    expect(index).toHaveBeenCalledWith("ru");
    expect(index).not.toHaveBeenCalledWith("el");
    expect(deleteDocument).toHaveBeenCalledWith("page_abc123xy");
  });

  it("is idempotent: replaying the same create payload twice is harmless", async () => {
    const { POST } = await import("./route");
    const payload = {
      event: "entry.create",
      model: "page",
      entry: { documentId: "abc123xy", locale: "el", publishedAt: "2024-01-01T00:00:00.000Z" },
    };

    const response1 = await POST(strapiSignedRequest(payload));
    expect(response1.status).toBe(200);

    const response2 = await POST(strapiSignedRequest(payload));
    expect(response2.status).toBe(200);

    expect(getPageByDocumentIdResult).toHaveBeenCalledTimes(2);
    expect(addDocuments).toHaveBeenCalledTimes(2);
  });

  it("rejects webhook payload with invalid HMAC signature", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({
      event: "entry.create",
      model: "page",
      entry: { documentId: "abc123xy", locale: "el", publishedAt: "2024-01-01T00:00:00.000Z" },
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
    expect(deleteDocument).not.toHaveBeenCalled();
  });

  it("returns no-op when search is disabled for webhook payloads", async () => {
    vi.stubEnv("SEARCH_ENABLED", "false");
    const { POST } = await import("./route");

    const response = await POST(
      strapiSignedRequest({
        event: "entry.create",
        model: "page",
        entry: { documentId: "abc123xy", locale: "el", publishedAt: "2024-01-01T00:00:00.000Z" },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, noop: true });
    expect(getMeiliAdminClient).not.toHaveBeenCalled();
  });

  it("rejects unknown event type with 400", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      strapiSignedRequest({
        event: "entry.publish",
        model: "page",
        entry: { documentId: "abc123xy", locale: "el", publishedAt: "2024-01-01T00:00:00.000Z" },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Unknown event type." });
    expect(addDocuments).not.toHaveBeenCalled();
    expect(deleteDocument).not.toHaveBeenCalled();
  });

  it("rejects invalid locale in webhook payload with 400", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      strapiSignedRequest({
        event: "entry.create",
        model: "page",
        entry: { documentId: "abc123xy", locale: "fr", publishedAt: "2024-01-01T00:00:00.000Z" },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Unsupported locale." });
    expect(addDocuments).not.toHaveBeenCalled();
    expect(deleteDocument).not.toHaveBeenCalled();
  });
});

function syncSynonymsSignedRequest(payload: unknown, secret = "test-webhook-secret"): Request {
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

describe("POST /api/search/reindex - sync-synonyms", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SEARCH_ENABLED", "true");
    vi.stubEnv("STRAPI_WEBHOOK_SECRET", "test-webhook-secret");
    getMeiliAdminClient.mockReturnValue({ index });
    addDocuments.mockReturnValue(enqueuedTask());
    deleteDocument.mockReturnValue(enqueuedTask());
    updateSynonyms.mockReturnValue(enqueuedTask());
    updateStopWords.mockReturnValue(enqueuedTask());
    loadSynonymsAndStopWords.mockReturnValue({
      synonyms: { a: ["b"] },
      stopWords: ["x", "y"],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("calls updateSynonyms and updateStopWords on the locale index", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      syncSynonymsSignedRequest({ action: "sync-synonyms", locale: "el" }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      ok: true,
      action: "sync-synonyms",
      locale: "el",
      index: "el",
    });
    expect(loadSynonymsAndStopWords).toHaveBeenCalledWith("el");
    expect(updateSynonyms).toHaveBeenCalledWith({ a: ["b"] });
    expect(updateStopWords).toHaveBeenCalledWith(["x", "y"]);
    expect(updateSynonyms.mock.results[0]?.value.waitTask).toHaveBeenCalledWith({
      timeout: 5000,
      interval: 50,
    });
    expect(updateStopWords.mock.results[0]?.value.waitTask).toHaveBeenCalledWith({
      timeout: 5000,
      interval: 50,
    });
  });

  it("targets only the el index for a Greek locale", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      syncSynonymsSignedRequest({ action: "sync-synonyms", locale: "el" }),
    );
    expect(response.status).toBe(200);

    expect(index).toHaveBeenCalledWith("el");
    expect(index).not.toHaveBeenCalledWith("ru");
  });

  it("targets only the ru index for a Russian locale", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      syncSynonymsSignedRequest({ action: "sync-synonyms", locale: "ru" }),
    );
    expect(response.status).toBe(200);

    expect(index).toHaveBeenCalledWith("ru");
    expect(index).not.toHaveBeenCalledWith("el");
  });

  it("is idempotent: running the same sync twice yields the same result", async () => {
    const { POST } = await import("./route");
    const payload = { action: "sync-synonyms", locale: "el" };

    const response1 = await POST(syncSynonymsSignedRequest(payload));
    expect(response1.status).toBe(200);

    const response2 = await POST(syncSynonymsSignedRequest(payload));
    expect(response2.status).toBe(200);

    expect(updateSynonyms).toHaveBeenCalledTimes(2);
    expect(updateStopWords).toHaveBeenCalledTimes(2);
  });

  it("rejects sync-synonyms with HMAC rejection → 401", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({ action: "sync-synonyms", locale: "el" });

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
    expect(loadSynonymsAndStopWords).not.toHaveBeenCalled();
    expect(updateSynonyms).not.toHaveBeenCalled();
    expect(updateStopWords).not.toHaveBeenCalled();
  });

  it("returns no-op when search is disabled", async () => {
    vi.stubEnv("SEARCH_ENABLED", "false");
    const { POST } = await import("./route");

    const response = await POST(
      syncSynonymsSignedRequest({ action: "sync-synonyms", locale: "el" }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, noop: true });
    expect(getMeiliAdminClient).not.toHaveBeenCalled();
    expect(loadSynonymsAndStopWords).not.toHaveBeenCalled();
    expect(updateSynonyms).not.toHaveBeenCalled();
    expect(updateStopWords).not.toHaveBeenCalled();
  });

  it("rejects unknown locale with 400", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      syncSynonymsSignedRequest({ action: "sync-synonyms", locale: "fr" }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Unsupported locale." });
    expect(loadSynonymsAndStopWords).not.toHaveBeenCalled();
    expect(updateSynonyms).not.toHaveBeenCalled();
    expect(updateStopWords).not.toHaveBeenCalled();
  });
});
