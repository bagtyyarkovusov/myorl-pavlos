import { describe, expect, it } from "vitest";

import { paginate, parsePageParam } from "./paginate";

describe("paginate", () => {
  it("returns full first page and correct totalPages", () => {
    const items = Array.from({ length: 35 }, (_, i) => i);
    const { slice, totalPages } = paginate(items, 1, 30);
    expect(slice.length).toBe(30);
    expect(totalPages).toBe(2);
  });

  it("returns remainder on last page", () => {
    const items = Array.from({ length: 35 }, (_, i) => i);
    const { slice, totalPages } = paginate(items, 2, 30);
    expect(slice.length).toBe(5);
    expect(totalPages).toBe(2);
  });

  it("clamps page beyond range", () => {
    const items = [1, 2, 3];
    const { slice, totalPages } = paginate(items, 99, 30);
    expect(totalPages).toBe(1);
    expect(slice).toEqual([1, 2, 3]);
  });
});

describe("parsePageParam", () => {
  it("parses positive integers", () => {
    expect(parsePageParam("2")).toBe(2);
    expect(parsePageParam(["3"])).toBe(3);
  });

  it("defaults invalid values to 1", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("x")).toBe(1);
  });
});
