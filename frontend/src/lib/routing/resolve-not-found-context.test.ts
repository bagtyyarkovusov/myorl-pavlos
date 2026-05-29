import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHeaders = vi.fn();

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

describe("resolveNotFoundContext", () => {
  beforeEach(() => {
    mockHeaders.mockReset();
  });

  it("uses params when locale and slug are provided", async () => {
    const { resolveNotFoundContext } = await import("./resolve-not-found-context");

    const result = await resolveNotFoundContext(
      Promise.resolve({ locale: "ru", slug: "test-page" }),
    );

    expect(result).toEqual({ locale: "ru", slug: "test-page" });
    expect(mockHeaders).not.toHaveBeenCalled();
  });

  it("falls back to x-pathname when params are missing", async () => {
    mockHeaders.mockResolvedValue(new Headers({ "x-pathname": "/el/missing-slug" }));

    const { resolveNotFoundContext } = await import("./resolve-not-found-context");

    const result = await resolveNotFoundContext();

    expect(result).toEqual({ locale: "el", slug: "missing-slug" });
  });

  it("defaults locale to el for invalid pathname locale", async () => {
    mockHeaders.mockResolvedValue(new Headers({ "x-pathname": "/fr/foo" }));

    const { resolveNotFoundContext } = await import("./resolve-not-found-context");

    const result = await resolveNotFoundContext();

    expect(result).toEqual({ locale: "el", slug: "foo" });
  });
});
