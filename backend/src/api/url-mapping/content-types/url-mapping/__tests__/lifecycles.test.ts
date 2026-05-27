import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  normalizeLegacyPath,
  validateLegacyPath,
  validateDestinationPath,
  triggerRevalidation,
} from "../lifecycles";
import lifecycles from "../lifecycles";

// ---------------------------------------------------------------------------
// normalizeLegacyPath
// ---------------------------------------------------------------------------
describe("normalizeLegacyPath", () => {
  it("trims trailing slashes", () => {
    expect(normalizeLegacyPath("/el/rhinoplasty/")).toBe("/el/rhinoplasty");
  });

  it("trims multiple trailing slashes", () => {
    expect(normalizeLegacyPath("/el/rhinoplasty///")).toBe("/el/rhinoplasty");
  });

  it("decodes percent-encoded Greek characters", () => {
    const encoded = "/%CE%B1%CE%BC%CF%85%CE%B3%CE%B4%CE%B1%CE%BB%CE%B5%CE%BA%CF%84%CE%BF%CE%BC%CE%AE";
    const expected = "/αμυγδαλεκτομή";
    expect(normalizeLegacyPath(encoded)).toBe(expected);
  });

  it("decodes percent-encoded Cyrillic characters", () => {
    expect(normalizeLegacyPath("/%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82")).toBe("/привет");
  });

  it("leaves decoded Unicode paths unchanged", () => {
    const path = "/αμυγδαλεκτομή";
    expect(normalizeLegacyPath(path)).toBe(path);
  });

  it("handles mixed percent-encoded and decoded segments", () => {
    const input = "/el/%CF%81%CE%B9%CE%BD%CE%BF%CF%80%CE%BB%CE%B1%CF%83%CF%84%CE%B9%CE%BA%CE%AE/";
    const expected = "/el/ρινοπλαστική";
    expect(normalizeLegacyPath(input)).toBe(expected);
  });

  it("is idempotent — already-normal paths stay the same", () => {
    const path = "/el/rhinoplasty";
    expect(normalizeLegacyPath(normalizeLegacyPath(path))).toBe("/el/rhinoplasty");
  });

  it("does not crash on invalid percent sequences", () => {
    expect(normalizeLegacyPath("/bad%ZZ")).toBe("/bad%ZZ");
  });
});

// ---------------------------------------------------------------------------
// validateLegacyPath
// ---------------------------------------------------------------------------
describe("validateLegacyPath", () => {
  it("does not throw when path starts with /", () => {
    expect(() => validateLegacyPath("/el/rhinoplasty")).not.toThrow();
  });

  it("throws when path does not start with /", () => {
    expect(() => validateLegacyPath("el/rhinoplasty")).toThrow(
      "legacyPath must start with /",
    );
  });

  it("throws for an empty string", () => {
    expect(() => validateLegacyPath("")).toThrow("legacyPath must start with /");
  });
});

// ---------------------------------------------------------------------------
// validateDestinationPath
// ---------------------------------------------------------------------------
describe("validateDestinationPath", () => {
  it("does not throw when path has no trailing slash", () => {
    expect(() => validateDestinationPath("/el/rhinoplasty")).not.toThrow();
  });

  it("throws when path ends with /", () => {
    expect(() => validateDestinationPath("/el/rhinoplasty/")).toThrow(
      "destinationPath must not end with /",
    );
  });
});

// ---------------------------------------------------------------------------
// triggerRevalidation
// ---------------------------------------------------------------------------
describe("triggerRevalidation", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockLog: { warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({ ok: true });
    mockLog = { warn: vi.fn(), error: vi.fn() };
  });

  it("POSTs to the revalidate endpoint with tags in body and secret in query", async () => {
    await triggerRevalidation({
      fetch: mockFetch,
      log: mockLog,
      baseUrl: "http://localhost:3000/api/revalidate",
      secret: "test-secret",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/revalidate?secret=test-secret",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: ["url-mappings"] }),
      },
    );
  });

  it("skips when base URL is missing", async () => {
    await triggerRevalidation({
      fetch: mockFetch,
      log: mockLog,
      baseUrl: "",
      secret: "test-secret",
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.stringContaining("NEXT_REVALIDATE_URL or STRAPI_REVALIDATE_SECRET"),
    );
  });

  it("skips when secret is missing", async () => {
    await triggerRevalidation({
      fetch: mockFetch,
      log: mockLog,
      baseUrl: "http://localhost:3000/api/revalidate",
      secret: "",
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("logs an error when the response is not ok", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, statusText: "Unauthorized" });

    await triggerRevalidation({
      fetch: mockFetch,
      log: mockLog,
      baseUrl: "http://localhost:3000/api/revalidate",
      secret: "wrong",
    });

    expect(mockLog.error).toHaveBeenCalledWith(
      "URL Mapping revalidation failed: 401 Unauthorized",
    );
  });

  it("catches fetch errors gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    await triggerRevalidation({
      fetch: mockFetch,
      log: mockLog,
      baseUrl: "http://localhost:3000/api/revalidate",
      secret: "s",
    });

    expect(mockLog.error).toHaveBeenCalledWith(
      "URL Mapping revalidation request failed",
      expect.any(Error),
    );
  });
});

// ---------------------------------------------------------------------------
// Lifecycle hook integration
// ---------------------------------------------------------------------------
describe("lifecycle hooks", () => {
  it("beforeCreate normalizes and validates legacyPath", async () => {
    const data: Record<string, unknown> = {
      legacyPath: "/%CE%B1%CE%BC%CF%85%CE%B3%CE%B4%CE%B1%CE%BB%CE%B5%CE%BA%CF%84%CE%BF%CE%BC%CE%AE/",
      destinationPath: "/el/amygdalektomi",
      destinationKind: "internal-301",
      locale: "el",
    };

    await lifecycles.beforeCreate({ params: { data } });

    expect(data.legacyPath).toBe("/αμυγδαλεκτομή");
  });

  it("beforeCreate trims trailing slashes from destinationPath", async () => {
    const data: Record<string, unknown> = {
      legacyPath: "/old-page",
      destinationPath: "/el/new-page/",
      destinationKind: "internal-301",
    };

    await lifecycles.beforeCreate({ params: { data } });

    expect(data.destinationPath).toBe("/el/new-page");
  });

  it("beforeCreate throws when legacyPath does not start with /", async () => {
    const data: Record<string, unknown> = {
      legacyPath: "no-leading-slash",
      destinationPath: "/el/new-page",
      destinationKind: "internal-301",
    };

    await expect(lifecycles.beforeCreate({ params: { data } })).rejects.toThrow(
      "legacyPath must start with /",
    );
  });

  it("beforeCreate is a no-op when data is undefined", async () => {
    await expect(lifecycles.beforeCreate({ params: {} })).resolves.toBeUndefined();
  });

  it("beforeUpdate normalizes and validates like beforeCreate", async () => {
    const data: Record<string, unknown> = {
      legacyPath: "/old-path/",
      destinationPath: "/el/dest",
      destinationKind: "gone-410",
    };

    await lifecycles.beforeUpdate({ params: { data } });

    expect(data.legacyPath).toBe("/old-path");
  });

  it("beforeUpdate throws for invalid legacyPath", async () => {
    const data: Record<string, unknown> = {
      legacyPath: "bad",
      destinationPath: "/el/dest",
      destinationKind: "external-301",
    };

    await expect(lifecycles.beforeUpdate({ params: { data } })).rejects.toThrow(
      "legacyPath must start with /",
    );
  });

  it("leaves non-string fields untouched", async () => {
    const data: Record<string, unknown> = {
      legacyPath: 12345,
      destinationPath: null,
      destinationKind: "internal-301",
    };

    await expect(lifecycles.beforeCreate({ params: { data } })).resolves.toBeUndefined();
    expect(data.legacyPath).toBe(12345); // unchanged
  });
});
