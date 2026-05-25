import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

describe("middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ADMIN_TOKEN", "test-admin-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  function makeRequest(path: string, authHeader?: string): NextRequest {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers["authorization"] = authHeader;
    }
    return new NextRequest(`http://localhost${path}`, { headers });
  }

  it("returns 401 for /admin routes without auth header", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(makeRequest("/admin/search-analytics"));

    expect(response.status).toBe(401);
  });

  it("returns 401 for /admin routes with wrong token", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(
      makeRequest("/admin/search-analytics", "Bearer wrong-token"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 for /admin routes with missing Bearer prefix", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(
      makeRequest("/admin/search-analytics", "test-admin-token"),
    );

    expect(response.status).toBe(401);
  });

  it("passes through /admin routes with correct Bearer token", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(
      makeRequest("/admin/search-analytics", "Bearer test-admin-token"),
    );

    expect(response.status).toBe(200);
  });

  it("passes through non-admin routes without auth", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(makeRequest("/el"));

    expect(response.status).toBe(200);
  });

  it("passes through non-admin routes even with no ADMIN_TOKEN set", async () => {
    vi.stubEnv("ADMIN_TOKEN", undefined);
    const { middleware } = await import("./middleware");
    const response = await middleware(makeRequest("/el"));

    expect(response.status).toBe(200);
  });

  it("returns 401 for /admin when ADMIN_TOKEN is not configured", async () => {
    vi.stubEnv("ADMIN_TOKEN", undefined);
    const { middleware } = await import("./middleware");
    const response = await middleware(makeRequest("/admin/search-analytics"));

    expect(response.status).toBe(401);
  });

  it("returns 401 for /admin with only whitespace token", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(
      makeRequest("/admin/search-analytics", "Bearer   "),
    );

    expect(response.status).toBe(401);
  });

  it("sets WWW-Authenticate header on 401 responses", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(makeRequest("/admin/search-analytics"));

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe('Bearer');
  });
});
