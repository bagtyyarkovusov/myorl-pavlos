import "server-only";

import { cache } from "react";
import { buildNavigationTree } from "./navigation";
import { cms as productionGateway } from "./cms-gateway-setup";
import { NAVIGATION_POPULATE } from "./cms-populate";
import type { CmsGateway } from "./cms-gateway";
import type { Locale, NavigationNodeDTO } from "./types";

let _gateway: CmsGateway | null = null;

function getGateway(): CmsGateway {
  return _gateway ?? productionGateway;
}

/**
 * Injects a mock gateway for navigation-related tests.
 *
 * @param gw - A {@link CmsGateway} mock to use instead of the production gateway.
 */
export function injectFetchNavigationGatewayForTesting(gw: CmsGateway): void {
  _gateway = gw;
}

/**
 * Fetches the navigation tree for a locale.
 *
 * Wrapped in `React.cache` so multiple calls within the same request are
 * deduplicated.
 *
 * @param locale - The locale to fetch navigation for.
 * @returns The hierarchical navigation tree.
 */
export const fetchNavigation = cache(async (locale: Locale): Promise<NavigationNodeDTO[]> => {
  const gateway = getGateway();
  const pages = await gateway.pages.all({
    locale,
    sort: ["locale:asc", "menuIndex:asc", "slug:asc"],
    populate: NAVIGATION_POPULATE,
    cacheTags: ["navigation:" + locale, "pages"],
  });
  return buildNavigationTree(pages, locale);
});
