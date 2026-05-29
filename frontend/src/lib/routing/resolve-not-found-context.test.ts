import { describe, expect, it } from "vitest";

import { resolveNotFoundContext } from "./resolve-not-found-context";

describe("resolveNotFoundContext", () => {
  it("uses params when locale and slug are provided", async () => {
    const result = await resolveNotFoundContext(
      Promise.resolve({ locale: "ru", slug: "test-page" }),
    );

    expect(result).toEqual({ locale: "ru", slug: "test-page" });
  });

  it("returns the default el locale when params are missing", async () => {
    const result = await resolveNotFoundContext();

    expect(result).toEqual({ locale: "el", slug: "" });
  });

  it("returns the default el locale when params reject", async () => {
    const result = await resolveNotFoundContext(Promise.reject(new Error("boom")));

    expect(result).toEqual({ locale: "el", slug: "" });
  });
});
