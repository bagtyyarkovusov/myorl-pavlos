import { describe, expect, it, vi, beforeEach } from "vitest";

type ProxyFn = (
  arg: Parameters<typeof import("@/proxy").proxy>[0],
) => ReturnType<typeof import("@/proxy").proxy>;

function makeRequest(pathname: string, acceptLanguage?: string): Parameters<ProxyFn>[0] {
  const headers = new Headers();
  if (acceptLanguage) {
    headers.set("accept-language", acceptLanguage);
  }

  const url = new URL(`http://localhost:3000${pathname}`);

  return {
    nextUrl: {
      pathname,
      clone() {
        return new URL(url.toString());
      },
    },
    headers,
  } as unknown as Parameters<ProxyFn>[0];
}

let lastRedirectStatus: number | undefined;

const mockRedirect = vi.fn((url: URL | string, status?: number) => {
  lastRedirectStatus = status;
  return typeof url === "string" ? { url: new URL(url) } : { url };
});

function MockNextResponse(
  body?: string | null,
  init?: { status?: number; headers?: Record<string, string> },
) {
  return {
    body,
    status: init?.status ?? 200,
    headers: init?.headers ? new Headers(init.headers) : new Headers(),
  };
}
MockNextResponse.redirect = mockRedirect;

vi.mock("next/server", () => ({
  NextResponse: MockNextResponse,
}));

vi.mock("../../data/gone-paths.json", () => ({
  default: ["/retired-page", "/el/gone-article"],
}));

describe("proxy", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    lastRedirectStatus = undefined;
  });

  it("does not redirect when locale is already el", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/el/about");
    const response = proxy(request);
    expect(response).toBeUndefined();
  });

  it("does not redirect when locale is already ru", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/ru/contact");
    const response = proxy(request);
    expect(response).toBeUndefined();
  });

  it("passes through bare slugs — handled by next.config.ts redirects()", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/about", "el");
    const response = proxy(request);
    expect(response).toBeUndefined();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("passes through bare slugs regardless of Accept-Language", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/about", "ru");
    const response = proxy(request);
    expect(response).toBeUndefined();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("passes through bare slug with no Accept-Language header", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/about");
    const response = proxy(request);
    expect(response).toBeUndefined();
  });

  it("does not crash on malformed Accept-Language (*)", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/about", "*");
    expect(() => proxy(request)).not.toThrow();
  });

  it("skips file extension paths", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/image.png");
    const response = proxy(request);
    expect(response).toBeUndefined();
  });

  it("skips _next paths", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/_next/static/chunk.js");
    const response = proxy(request);
    expect(response).toBeUndefined();
  });

  it("skips API routes", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/api/revalidate");
    const response = proxy(request);
    expect(response).toBeUndefined();
  });

  it("skips favicon", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/favicon.ico");
    const response = proxy(request);
    expect(response).toBeUndefined();
  });

  it("redirects root / to /el with 308 permanent when Accept-Language is el", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/", "el");
    proxy(request);
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const url = mockRedirect.mock.calls[0]![0];
    expect(url.toString()).toContain("/el");
    expect(lastRedirectStatus).toBe(308);
  });

  it("redirects root / to /ru with 308 permanent when Accept-Language is ru", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/", "ru");
    proxy(request);
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const url = mockRedirect.mock.calls[0]![0];
    expect(url.toString()).toContain("/ru");
    expect(lastRedirectStatus).toBe(308);
  });

  it("redirects root / to /el with 308 when no Accept-Language header", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/");
    proxy(request);
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const url = mockRedirect.mock.calls[0]![0];
    expect(url.toString()).toContain("/el");
    expect(lastRedirectStatus).toBe(308);
  });

  it("returns 410 for a gone path matching a bare legacy path", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/retired-page");
    const response = proxy(request);
    expect(response).toBeDefined();
    expect(response!.status).toBe(410);
  });

  it("returns 410 for a gone path matching a locale-prefixed path", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/el/gone-article");
    const response = proxy(request);
    expect(response).toBeDefined();
    expect(response!.status).toBe(410);
  });

  it("includes noindex in 410 response body", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/retired-page");
    const response = proxy(request);
    expect(response).toBeDefined();
    expect(response!.body).toContain("noindex");
  });

  it("includes 'Page gone' text in 410 response body", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/retired-page");
    const response = proxy(request);
    expect(response).toBeDefined();
    expect(response!.body).toContain("gone");
  });

  it("passes through non-gone bare slugs unchanged", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/about");
    const response = proxy(request);
    expect(response).toBeUndefined();
  });

  it("passes through locale-prefixed paths that are not gone", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/el/about");
    const response = proxy(request);
    expect(response).toBeUndefined();
  });

  it("skips gone-paths check for root /", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/");
    proxy(request);
    // Root should still redirect, not trigger 410
    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });
});
