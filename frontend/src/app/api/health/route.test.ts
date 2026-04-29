import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockStrapiResponse<T>(data: T, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => data,
  };
}

beforeEach(() => {
  vi.stubEnv("STRAPI_URL", "http://localhost:1337");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/health", () => {
  it("returns ok when Strapi global endpoint responds", async () => {
    const { GET } = await import("./route");

    mockFetch.mockResolvedValueOnce(
      mockStrapiResponse({ data: { id: 1, documentId: "global-1" } }),
    );

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true, strapi: "ok" });
  });

  it("reports error when Strapi returns non-ok status", async () => {
    const { GET } = await import("./route");

    mockFetch.mockResolvedValueOnce(mockStrapiResponse(null, 500));

    const response = await GET();

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.strapi).toBe("error");
    expect(body.error).toContain("500");
  });

  it("reports error when Strapi is unreachable", async () => {
    const { GET } = await import("./route");

    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const response = await GET();

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.strapi).toBe("error");
    expect(body.error).toContain("ECONNREFUSED");
  });

  it("reports timeout error message", async () => {
    const { GET } = await import("./route");

    const timeoutError = new DOMException("The operation was aborted.", "TimeoutError");
    mockFetch.mockRejectedValueOnce(timeoutError);

    const response = await GET();

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain("timed out");
  });
});
