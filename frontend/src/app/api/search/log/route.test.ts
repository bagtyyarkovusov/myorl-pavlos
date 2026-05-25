import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();

vi.mock("@/lib/db", () => ({
  query: mockQuery,
}));

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/search/log", {
    method: "POST",
    headers: { "content-type": "application/json" },
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
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 204 and writes a row on valid payload", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const { POST } = await import("./route");
    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(204);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO search_query_log"),
      ["test query", "el", 5, "550e8400-e29b-41d4-a716-446655440000"],
    );
  });

  it("trims whitespace from query", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const { POST } = await import("./route");
    const response = await POST(makeRequest({ ...validPayload, query: "  hello  " }));

    expect(response.status).toBe(204);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO search_query_log"),
      ["hello", "el", 5, "550e8400-e29b-41d4-a716-446655440000"],
    );
  });

  it("returns 204 on valid ru locale", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

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
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejects blank query with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({ ...validPayload, query: "   " }));

    expect(response.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejects invalid locale with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({ ...validPayload, locale: "fr" }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("locale");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejects non-integer result_count with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({ ...validPayload, result_count: 3.5 }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("result_count");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejects negative result_count with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({ ...validPayload, result_count: -1 }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("result_count");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejects invalid session_id format with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({ ...validPayload, session_id: "not-a-uuid" }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("session_id");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejects missing session_id with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({ ...validPayload, session_id: undefined }),
    );

    expect(response.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
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
    expect(mockQuery).not.toHaveBeenCalled();
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
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 500 when the database write fails", async () => {
    mockQuery.mockRejectedValue(new Error("connection refused"));

    const { POST } = await import("./route");
    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(500);
  });
});
