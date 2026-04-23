/**
 * Grants Editor and Author roles permission to use the Navigation plugin,
 * so non-super-admin editors can actually see the tree browser after install.
 *
 * Idempotent: checks existing permissions per role before inserting.
 * Gated by a marker key so it only runs once per SEED_VERSION.
 */

type AnyStrapi = {
  log: { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string, err?: unknown) => void };
  store: (opts: { type: string; name: string }) => {
    get: (opts: { key: string }) => Promise<any>;
    set: (opts: { key: string; value: any }) => Promise<void>;
  };
  db: {
    query: (uid: string) => {
      findOne: (opts: any) => Promise<any>;
      findMany: (opts: any) => Promise<any[]>;
    };
  };
  service: (uid: string) => any;
};

const SEED_VERSION = 'v1';
const MARKER_KEY = 'hierarchy_ui_nav_permissions_version';

// Actions documented by strapi-plugin-navigation.
// Editors get read + update so they can manage navigations.
// Settings action stays Super-Admin-only.
const EDITOR_ACTIONS = ['plugin::navigation.read', 'plugin::navigation.update'];
const AUTHOR_ACTIONS = ['plugin::navigation.read'];

type PermissionSeed = { roleCode: string; actions: string[] };
const SEEDS: PermissionSeed[] = [
  { roleCode: 'strapi-editor', actions: EDITOR_ACTIONS },
  { roleCode: 'strapi-author', actions: AUTHOR_ACTIONS },
];

export async function seedNavigationPermissions(strapi: AnyStrapi): Promise<void> {
  const store = strapi.store({ type: 'plugin', name: 'content_manager' });
  const markerValue = await store.get({ key: MARKER_KEY });
  if (markerValue === SEED_VERSION) {
    return;
  }

  const roleService = strapi.service('admin::role');
  const permissionService = strapi.service('admin::permission');
  if (!roleService?.addPermissions || !permissionService?.findMany) {
    strapi.log.warn('[hierarchy-ui] admin role/permission service not available, skipping navigation permission seed');
    return;
  }

  // Confirm the plugin registered its actions before we try to assign them.
  const actionProvider = permissionService.actionProvider;
  const registeredActions: string[] | undefined = actionProvider?.values?.()?.map?.((a: any) => a.actionId);
  if (!registeredActions || !registeredActions.some((id) => id.startsWith('plugin::navigation.'))) {
    strapi.log.warn('[hierarchy-ui] plugin::navigation actions not registered yet, skipping permission seed');
    return;
  }

  for (const { roleCode, actions } of SEEDS) {
    try {
      const role = await strapi.db.query('admin::role').findOne({ where: { code: roleCode } });
      if (!role) {
        strapi.log.warn(`[hierarchy-ui] admin role "${roleCode}" not found, skipping`);
        continue;
      }

      const existing = await permissionService.findMany({
        where: { role: { id: role.id }, action: { $in: actions } },
      });
      const existingActions = new Set(existing.map((p: any) => p.action));
      const toAdd = actions
        .filter((action) => !existingActions.has(action))
        .map((action) => ({ action, subject: null, properties: {}, conditions: [] }));

      if (toAdd.length === 0) {
        strapi.log.info(`[hierarchy-ui] navigation permissions already assigned to ${roleCode}`);
        continue;
      }

      await roleService.addPermissions(role.id, toAdd);
      strapi.log.info(
        `[hierarchy-ui] granted ${toAdd.length} navigation permission(s) to ${roleCode}: ${toAdd.map((p) => p.action).join(', ')}`
      );
    } catch (err) {
      strapi.log.error(`[hierarchy-ui] failed to grant navigation permissions to ${roleCode}`, err);
    }
  }

  await store.set({ key: MARKER_KEY, value: SEED_VERSION });
}
