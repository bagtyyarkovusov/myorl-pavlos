import { afterEach, describe, expect, it, vi } from "vitest";

const Meilisearch = vi.fn();

vi.mock("meilisearch", () => ({ Meilisearch }));

describe("Meilisearch client factories", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("maps supported locales to Search Index names", async () => {
    const { indexNameForLocale } = await import("./meili-client");

    expect(indexNameForLocale("el")).toBe("el");
    expect(indexNameForLocale("ru")).toBe("ru");
  });

  it("returns null without throwing when search is disabled", async () => {
    vi.stubEnv("SEARCH_ENABLED", "false");
    vi.stubEnv("MEILI_HOST", "http://localhost:57700");
    vi.stubEnv("MEILI_MASTER_KEY", "master");
    const { getMeiliAdminClient, getMeiliSearchClient } = await import("./meili-client");

    expect(getMeiliAdminClient()).toBeNull();
    expect(getMeiliSearchClient()).toBeNull();
    expect(Meilisearch).not.toHaveBeenCalled();
  });

  it("returns null without throwing when the host is missing", async () => {
    vi.stubEnv("SEARCH_ENABLED", "true");
    vi.stubEnv("MEILI_MASTER_KEY", "master");
    const { getMeiliAdminClient } = await import("./meili-client");

    expect(getMeiliAdminClient()).toBeNull();
  });

  it("creates singleton admin and scoped search clients", async () => {
    vi.stubEnv("SEARCH_ENABLED", "true");
    vi.stubEnv("MEILI_HOST", "http://localhost:57700");
    vi.stubEnv("MEILI_MASTER_KEY", "master");
    vi.stubEnv("NEXT_PUBLIC_MEILI_SEARCH_KEY", "search");
    Meilisearch.mockImplementation((config: unknown) => ({ config }));
    const { getMeiliAdminClient, getMeiliSearchClient } = await import("./meili-client");

    const adminA = getMeiliAdminClient();
    const adminB = getMeiliAdminClient();
    const searchA = getMeiliSearchClient();
    const searchB = getMeiliSearchClient();

    expect(adminA).toBe(adminB);
    expect(searchA).toBe(searchB);
    expect(Meilisearch).toHaveBeenCalledWith({
      host: "http://localhost:57700",
      apiKey: "master",
      timeout: 2000,
    });
    expect(Meilisearch).toHaveBeenCalledWith({
      host: "http://localhost:57700",
      apiKey: "search",
      timeout: 2000,
    });
  });
});
