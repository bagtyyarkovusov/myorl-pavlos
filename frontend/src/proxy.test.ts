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

const mockRedirect = vi.fn((url: URL | string) => {
  return typeof url === "string" ? { url: new URL(url) } : { url };
});

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: mockRedirect,
  },
}));

describe("proxy", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
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

  it("redirects bare path to el when Accept-Language is el", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/about", "el");
    proxy(request);
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const url = mockRedirect.mock.calls[0]![0];
    expect(url.toString()).toContain("/el/about");
  });

  it("redirects bare path to ru when Accept-Language is ru", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/about", "ru");
    proxy(request);
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const url = mockRedirect.mock.calls[0]![0];
    expect(url.toString()).toContain("/ru/about");
  });

  it("redirects to el as default when no Accept-Language header", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/about");
    proxy(request);
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const url = mockRedirect.mock.calls[0]![0];
    expect(url.toString()).toContain("/el/about");
  });

  it("does not crash on malformed Accept-Language (*)", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/about", "*");
    expect(() => proxy(request)).not.toThrow();
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const url = mockRedirect.mock.calls[0]![0];
    expect(url.toString()).toContain("/el/about");
  });

  it("defaults to el when Accept-Language is unsupported (fr)", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/about", "fr");
    proxy(request);
    const url = mockRedirect.mock.calls[0]![0];
    expect(url.toString()).toContain("/el/about");
  });

  it("matches el from el-GR (region-stripped)", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/about", "el-GR");
    proxy(request);
    const url = mockRedirect.mock.calls[0]![0];
    expect(url.toString()).toContain("/el/about");
  });

  it("respects q-value ordering in Accept-Language", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/about", "ru;q=0.5, el;q=0.9");
    proxy(request);
    const url = mockRedirect.mock.calls[0]![0];
    expect(url.toString()).toContain("/el/about");
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

  it("redirects root / to /ru with Russian preference", async () => {
    const { proxy } = await import("@/proxy");
    const request = makeRequest("/", "ru");
    proxy(request);
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const url = mockRedirect.mock.calls[0]![0];
    expect(url.toString()).toContain("/ru");
  });
});
