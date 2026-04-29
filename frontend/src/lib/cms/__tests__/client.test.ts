import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createCmsGateway } from "../cms-gateway";
import type { CmsGateway } from "../cms-gateway";

const FIXTURES_DIR = path.resolve(__dirname, "__fixtures__");

function loadFixture(filename: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, filename), "utf-8"));
}

function mockStrapiResponse(data: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => data,
  };
}

function createTestGateway(mockFn: typeof globalThis.fetch): CmsGateway {
  return createCmsGateway({
    baseUrl: "http://localhost:1337",
    fetchFn: mockFn,
  });
}

beforeEach(() => {
  vi.stubEnv("STRAPI_URL", "http://localhost:1337");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("fetchNavigation", () => {
  it("returns NavigationNodeDTO[] from fixture pages", async () => {
    const { fetchNavigation, injectFetchNavigationGatewayForTesting } = await import("../client");
    const fixture = loadFixture("navigation-pages.json");

    const mockFetch = vi.fn().mockResolvedValue(mockStrapiResponse(fixture));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    injectFetchNavigationGatewayForTesting(gateway);

    const tree = await fetchNavigation("el");

    expect(tree).toBeInstanceOf(Array);
    expect(tree.length).toBeGreaterThan(0);

    const root = tree[0]!;
    expect(root.documentId).toBe("home123");
    expect(root.slug).toBe("index");
    expect(root.title).toBe("Home");
    expect(root.navLabel).toBe("Home");
    expect(root.href).toBe("/el");
    expect(root.children).toBeInstanceOf(Array);
  });

  it("returns empty array when no pages present", async () => {
    const { fetchNavigation, injectFetchNavigationGatewayForTesting } = await import("../client");

    const mockFetch = vi.fn().mockResolvedValue(
      mockStrapiResponse({
        data: [],
        meta: { pagination: { page: 1, pageSize: 100, total: 0 } },
      }),
    );
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    injectFetchNavigationGatewayForTesting(gateway);

    const tree = await fetchNavigation("el");

    expect(tree).toEqual([]);
  });
});
