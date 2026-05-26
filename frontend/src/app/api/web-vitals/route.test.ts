import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockLogWebVital = vi.fn();

vi.mock("@/lib/db", () => ({
  logWebVital: mockLogWebVital,
  logSearchQuery: vi.fn(),
  query: vi.fn(),
}));

function makeRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/web-vitals", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  metrics: [
    {
      metric: "LCP",
      value: 1234.5,
      path: "/el",
      locale: "el",
      device_type: "desktop",
      session_id: "550e8400-e29b-41d4-a716-446655440000",
    },
  ],
};

describe("POST /api/web-vitals", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogWebVital.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 204 and writes rows for a valid single-metric payload", async () => {
    mockLogWebVital.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(204);
    expect(mockLogWebVital).toHaveBeenCalledTimes(1);
    expect(mockLogWebVital).toHaveBeenCalledWith(
      "LCP",
      1234.5,
      "/el",
      "el",
      "desktop",
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("returns 204 and writes multiple rows for a batch payload", async () => {
    mockLogWebVital.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        metrics: [
          {
            metric: "LCP",
            value: 1000,
            path: "/el",
            locale: "el",
            device_type: "desktop",
            session_id: "550e8400-e29b-41d4-a716-446655440000",
          },
          {
            metric: "CLS",
            value: 0.05,
            path: "/el",
            locale: "el",
            device_type: "desktop",
            session_id: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
      }),
    );

    expect(response.status).toBe(204);
    expect(mockLogWebVital).toHaveBeenCalledTimes(2);
  });

  it("accepts all five valid metric types", async () => {
    mockLogWebVital.mockResolvedValue(undefined);

    const { POST } = await import("./route");

    for (const metric of ["LCP", "CLS", "INP", "FCP", "TTFB"]) {
      const response = await POST(
        makeRequest({
          metrics: [
            {
              ...validPayload.metrics[0],
              metric,
            },
          ],
        }),
      );
      expect(response.status).toBe(204);
    }
  });

  it("accepts all three device types", async () => {
    mockLogWebVital.mockResolvedValue(undefined);

    const { POST } = await import("./route");

    for (const dt of ["mobile", "desktop", "tablet"]) {
      const response = await POST(
        makeRequest({
          metrics: [
            {
              ...validPayload.metrics[0],
              device_type: dt,
            },
          ],
        }),
      );
      expect(response.status).toBe(204);
    }
  });

  it("accepts ru locale", async () => {
    mockLogWebVital.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        metrics: [
          {
            ...validPayload.metrics[0],
            locale: "ru",
          },
        ],
      }),
    );

    expect(response.status).toBe(204);
  });

  it("trims whitespace from path", async () => {
    mockLogWebVital.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        metrics: [
          {
            ...validPayload.metrics[0],
            path: "  /el/about  ",
          },
        ],
      }),
    );

    expect(response.status).toBe(204);
    expect(mockLogWebVital).toHaveBeenCalledWith(
      "LCP",
      1234.5,
      "/el/about",
      "el",
      "desktop",
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("rejects empty metrics array with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({ metrics: [] }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("empty");
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("rejects missing metrics field with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({ other: "data" }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("metrics");
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("rejects more than 20 metrics with 400", async () => {
    const { POST } = await import("./route");
    const metrics = Array.from({ length: 21 }, () => validPayload.metrics[0]);
    const response = await POST(makeRequest({ metrics }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("Max 20");
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("rejects invalid metric name with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        metrics: [{ ...validPayload.metrics[0], metric: "FID" }],
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("metric");
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("rejects negative value with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        metrics: [{ ...validPayload.metrics[0], value: -1 }],
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("value");
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("rejects Infinity value with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        metrics: [{ ...validPayload.metrics[0], value: Infinity }],
      }),
    );

    expect(response.status).toBe(400);
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("rejects empty path with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        metrics: [{ ...validPayload.metrics[0], path: "" }],
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("path");
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("rejects invalid locale with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        metrics: [{ ...validPayload.metrics[0], locale: "fr" }],
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("locale");
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("rejects invalid device_type with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        metrics: [{ ...validPayload.metrics[0], device_type: "watch" }],
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("device_type");
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("rejects invalid session_id with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        metrics: [{ ...validPayload.metrics[0], session_id: "not-a-uuid" }],
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("session_id");
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("rejects non-object metric entry with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeRequest({ metrics: ["not-an-object"] }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("metrics[0]");
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("rejects non-object body with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/web-vitals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '"just a string"',
      }),
    );

    expect(response.status).toBe(400);
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/web-vitals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      }),
    );

    expect(response.status).toBe(400);
    expect(mockLogWebVital).not.toHaveBeenCalled();
  });

  it("returns 500 when database write fails", async () => {
    mockLogWebVital.mockRejectedValue(new Error("connection refused"));

    const { POST } = await import("./route");
    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(500);
  });

  it("writes partial metrics before a DB failure on a later metric", async () => {
    mockLogWebVital
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("connection refused"));

    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        metrics: [validPayload.metrics[0], { ...validPayload.metrics[0], metric: "CLS" }],
      }),
    );

    expect(response.status).toBe(500);
    expect(mockLogWebVital).toHaveBeenCalledTimes(2);
  });

  it("returns 429 after 10 requests from the same IP within the window", async () => {
    mockLogWebVital.mockResolvedValue(undefined);

    const { POST } = await import("./route");

    for (let i = 0; i < 10; i++) {
      const response = await POST(makeRequest(validPayload, { "x-forwarded-for": "192.168.1.1" }));
      expect(response.status).toBe(204);
    }

    const rateLimited = await POST(makeRequest(validPayload, { "x-forwarded-for": "192.168.1.1" }));

    expect(rateLimited.status).toBe(429);
    const json = await rateLimited.json();
    expect(json.error).toContain("Too many requests");
  });

  it("counts different IPs independently for rate limiting", async () => {
    mockLogWebVital.mockResolvedValue(undefined);

    const { POST } = await import("./route");

    for (let i = 0; i < 10; i++) {
      await POST(makeRequest(validPayload, { "x-forwarded-for": "192.168.1.1" }));
    }

    const rateLimited = await POST(makeRequest(validPayload, { "x-forwarded-for": "192.168.1.1" }));
    expect(rateLimited.status).toBe(429);

    const otherIP = await POST(makeRequest(validPayload, { "x-forwarded-for": "10.0.0.1" }));
    expect(otherIP.status).toBe(204);
  });

  it("resolves x-real-ip as fallback for rate limiting", async () => {
    mockLogWebVital.mockResolvedValue(undefined);

    const { POST } = await import("./route");

    for (let i = 0; i < 10; i++) {
      const response = await POST(makeRequest(validPayload, { "x-real-ip": "10.10.10.10" }));
      expect(response.status).toBe(204);
    }

    const rateLimited = await POST(makeRequest(validPayload, { "x-real-ip": "10.10.10.10" }));
    expect(rateLimited.status).toBe(429);
  });
});
