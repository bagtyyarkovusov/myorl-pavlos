import "server-only";

import { cache } from "react";
import { buildNavigationTree } from "./navigation";
import { cms as productionGateway } from "./cms-gateway-setup";
import type { CmsGateway } from "./cms-gateway";
import type { Locale, NavigationNodeDTO } from "./types";

let _gateway: CmsGateway | null = null;

function getGateway(): CmsGateway {
  return _gateway ?? productionGateway;
}

export function injectFetchNavigationGatewayForTesting(gw: CmsGateway): void {
  _gateway = gw;
}

export const fetchNavigation = cache(async (locale: Locale): Promise<NavigationNodeDTO[]> => {
  const gateway = getGateway();
  const pages = await gateway.pages.all({
    locale,
    sort: ["locale:asc", "menuIndex:asc", "slug:asc"],
    cacheTags: ["navigation:" + locale, "pages"],
  });
  return buildNavigationTree(pages, locale);
});
