import { describe, expect, it, vi } from "vitest";
import { seedNavigationPermissions } from "../navigation-permissions";
import type { Core } from "@strapi/strapi";

function createMockStrapi(overrides?: {
  markerValue?: unknown;
  roles?: Array<{ id: number; code: string }>;
  existingPermissions?: Array<{ action: string }>;
  registeredActions?: string[];
}): Core.Strapi {
  const store = {
    get: vi.fn().mockResolvedValue(overrides?.markerValue),
    set: vi.fn().mockResolvedValue(undefined),
  };

  const roleService = {
    addPermissions: vi.fn().mockResolvedValue(undefined),
  };

  const permissionService = {
    findMany: vi.fn().mockResolvedValue(overrides?.existingPermissions ?? []),
    actionProvider: {
      values: vi.fn(() =>
        (overrides?.registeredActions ?? ["plugin::navigation.read", "plugin::navigation.update"]).map(
          (actionId) => ({ actionId }),
        ),
      ),
    },
  };

  const dbQuery = {
    findOne: vi.fn(({ where }: { where: { code: string } }) => {
      return (overrides?.roles ?? []).find((r) => r.code === where.code) ?? null;
    }),
  };

  return {
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    store: vi.fn(() => store),
    service: vi.fn((uid: string) => {
      if (uid === "admin::role") return roleService;
      if (uid === "admin::permission") return permissionService;
      return {};
    }),
    db: {
      query: vi.fn(() => dbQuery),
    },
  } as unknown as Core.Strapi;
}

describe("seedNavigationPermissions", () => {
  it("grants Editor role read + update navigation permissions", async () => {
    const strapi = createMockStrapi({
      markerValue: null,
      roles: [{ id: 1, code: "strapi-editor" }],
    });

    await seedNavigationPermissions(strapi);

    const roleService = strapi.service("admin::role");
    expect(roleService.addPermissions).toHaveBeenCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({ action: "plugin::navigation.read" }),
        expect.objectContaining({ action: "plugin::navigation.update" }),
      ]),
    );
  });

  it("grants Author role read-only navigation permission", async () => {
    const strapi = createMockStrapi({
      markerValue: null,
      roles: [{ id: 2, code: "strapi-author" }],
    });

    await seedNavigationPermissions(strapi);

    const roleService = strapi.service("admin::role");
    expect(roleService.addPermissions).toHaveBeenCalledWith(
      2,
      expect.arrayContaining([expect.objectContaining({ action: "plugin::navigation.read" })]),
    );
  });

  it("skips already-existing permissions (idempotent delta)", async () => {
    const strapi = createMockStrapi({
      markerValue: null,
      roles: [{ id: 1, code: "strapi-editor" }],
      existingPermissions: [{ action: "plugin::navigation.read" }],
    });

    await seedNavigationPermissions(strapi);

    const roleService = strapi.service("admin::role");
    const calls = (roleService.addPermissions as ReturnType<typeof vi.fn>).mock.calls;
    const editorCall = calls.find((c) => c[0] === 1);
    expect(editorCall?.[1]).toHaveLength(1);
    expect(editorCall?.[1][0]).toMatchObject({ action: "plugin::navigation.update" });
  });

  it("skips when marker already matches SEED_VERSION", async () => {
    const strapi = createMockStrapi({ markerValue: "v1" });

    await seedNavigationPermissions(strapi);

    expect(strapi.service("admin::role").addPermissions).not.toHaveBeenCalled();
  });
});
