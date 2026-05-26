import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockLogSearchQuery = vi.fn();

vi.mock("@/lib/db", () => ({
  logSearchQuery: mockLogSearchQuery,
}));

function makeRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/search/log", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  query: "test query",
  locale: "el",
  result_count: 5,
  session_id: "550e8400-e29b-41d4-a716-446655440000",
};

describe("POST /api/search/log", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogSearchQuery.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 204 and writes a row on valid payload", async () => {
    mockLogSearchQuery.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(204);
    expect(mockLogSearchQuery).toHaveBeenCalledTimes(1);
    expect(mockLogSearchQuery).toHaveBeenCalledWith(
      "test query",
      "el",
      5,
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("trims whitespace from query", async () => {
    mockLogSearchQuery.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const response = await POST(makeRequest({ ...validPayload, query: "  hello  " }));

    expect(response.status).toBe(204);
    expect(mockLogSearchQuery).toHaveBeenCalledWith(
      "hello",
      "el",
      5,
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("returns 204 on valid ru locale", async () => {
    mockLogSearchQuery.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const response = await POST(makeRequest({ ...validPayload, locale: "ru" }));

    expect(response.status).toBe(204);
  });

  it("rejects missing query with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({ ...validPayload, query: "" }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("query");
    expect(mockLogSearchQuery).not.toHaveBeenCalled();
  });

  it("rejects blank query with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({ ...validPayload, query: "   " }));

    expect(response.status).toBe(400);
    expect(mockLogSearchQuery).not.toHaveBeenCalled();
  });

  it("rejects invalid locale with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({ ...validPayload, locale: "fr" }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("locale");
    expect(mockLogSearchQuery).not.toHaveBeenCalled();
  });

  it("rejects non-integer result_count with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({ ...validPayload, result_count: 3.5 }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("result_count");
    expect(mockLogSearchQuery).not.toHaveBeenCalled();
  });

  it("rejects negative result_count with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({ ...validPayload, result_count: -1 }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("result_count");
    expect(mockLogSearchQuery).not.toHaveBeenCalled();
  });

  it("rejects invalid session_id format with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({ ...validPayload, session_id: "not-a-uuid" }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("session_id");
    expect(mockLogSearchQuery).not.toHaveBeenCalled();
  });

  it("rejects missing session_id with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({ ...validPayload, session_id: undefined }),
    );

    expect(response.status).toBe(400);
    expect(mockLogSearchQuery).not.toHaveBeenCalled();
  });

  it("rejects non-object body with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/search/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '"just a string"',
      }),
    );

    expect(response.status).toBe(400);
    expect(mockLogSearchQuery).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/search/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      }),
    );

    expect(response.status).toBe(400);
    expect(mockLogSearchQuery).not.toHaveBeenCalled();
  });

  it("returns 500 when the database write fails", async () => {
    mockLogSearchQuery.mockRejectedValue(new Error("connection refused"));

    const { POST } = await import("./route");
    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(500);
  });

  it("returns 429 after 10 requests from the same IP within the window", async () => {
    mockLogSearchQuery.mockResolvedValue(undefined);

    const { POST } = await import("./route");

    for (let i = 0; i < 10; i++) {
      const response = await POST(
        makeRequest(validPayload, { "x-forwarded-for": "192.168.1.1" }),
      );
      expect(response.status).toBe(204);
    }

    const rateLimited = await POST(
      makeRequest(validPayload, { "x-forwarded-for": "192.168.1.1" }),
    );

    expect(rateLimited.status).toBe(429);
    const json = await rateLimited.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("Too many requests");
  });

  it("counts different IPs independently", async () => {
    mockLogSearchQuery.mockResolvedValue(undefined);

    const { POST } = await import("./route");

    // Exhaust one IP
    for (let i = 0; i < 10; i++) {
      await POST(makeRequest(validPayload, { "x-forwarded-for": "192.168.1.1" }));
    }

    const rateLimited = await POST(
      makeRequest(validPayload, { "x-forwarded-for": "192.168.1.1" }),
    );
    expect(rateLimited.status).toBe(429);

    // Different IP still has full quota
    const otherIP = await POST(
      makeRequest(validPayload, { "x-forwarded-for": "10.0.0.1" }),
    );
    expect(otherIP.status).toBe(204);
  });

  it("resolves x-real-ip as fallback header", async () => {
    mockLogSearchQuery.mockResolvedValue(undefined);

    const { POST } = await import("./route");

    for (let i = 0; i < 10; i++) {
      const response = await POST(
        makeRequest(validPayload, { "x-real-ip": "10.10.10.10" }),
      );
      expect(response.status).toBe(204);
    }

    const rateLimited = await POST(
      makeRequest(validPayload, { "x-real-ip": "10.10.10.10" }),
    );
    expect(rateLimited.status).toBe(429);
  });
});
