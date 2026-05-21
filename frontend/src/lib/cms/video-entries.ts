import "server-only";

import { cache } from "react";
import { VIDEO_ENTRY_POPULATE } from "./cms-populate";
import { cms as productionGateway } from "./cms-gateway-setup";
import type { CmsGateway } from "./cms-gateway";
import type { Locale, VideoEntryDTO } from "./types";

let _gateway: CmsGateway | null = null;

function getGateway(): CmsGateway {
  return _gateway ?? productionGateway;
}

export function injectVideoEntriesGatewayForTesting(gw: CmsGateway): void {
  _gateway = gw;
}

/**
 * Fetches published video entries for a locale, sorted for directory display.
 */
export const fetchVideoEntries = cache(async (locale: Locale): Promise<VideoEntryDTO[]> => {
  const entries = await getGateway().videoEntries.all({
    locale,
    populate: VIDEO_ENTRY_POPULATE,
    sort: ["sortOrder:asc", "title:asc"],
    cacheTags: [`video-entries:${locale}`, "video-entries"],
    pageSize: 100,
  });

  return [...entries].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.title.localeCompare(right.title, locale);
  });
});
