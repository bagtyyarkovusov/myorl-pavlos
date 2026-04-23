/**
 * Self-heals the persisted Navigation plugin config when it was initialised
 * before our `Page` content type was registered as an internal-link target.
 *
 * strapi-plugin-navigation stores its config in the plugin store, and that
 * stored copy overrides `backend/config/plugins.ts` on subsequent boots. If
 * `contentTypes` is empty, the admin UI hides the "Internal link" option and
 * only shows "Wrapper" / "External link".
 */

type NavigationStoreConfig = {
  contentTypes?: string[];
};

type AnyStrapi = {
  log: { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string, err?: unknown) => void };
  store: (opts: { type: string; name: string }) => {
    get: (opts: { key: string }) => Promise<NavigationStoreConfig | null>;
  };
  plugin: (name: string) => { service: (name: string) => { restoreConfig?: () => Promise<void> } };
};

const PAGE_UID = 'api::page.page';
const CONFIG_KEY = 'config';

function shouldRestoreConfig(config: NavigationStoreConfig | null): boolean {
  if (!config) {
    return false;
  }

  const configuredContentTypes = Array.isArray(config.contentTypes) ? config.contentTypes : [];
  return configuredContentTypes.length === 0 || !configuredContentTypes.includes(PAGE_UID);
}

export async function seedNavigationConfig(strapi: AnyStrapi): Promise<void> {
  const store = strapi.store({ type: 'plugin', name: 'navigation' });
  const currentConfig = await store.get({ key: CONFIG_KEY });

  if (!shouldRestoreConfig(currentConfig)) {
    return;
  }

  const adminService = strapi.plugin('navigation')?.service('admin');
  if (!adminService?.restoreConfig) {
    strapi.log.warn('[hierarchy-ui] navigation admin service is unavailable, skipping config self-heal');
    return;
  }

  await adminService.restoreConfig();
  strapi.log.info('[hierarchy-ui] restored Navigation plugin config so Page can be used as an internal link target');
}
