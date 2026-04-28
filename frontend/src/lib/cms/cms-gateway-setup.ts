import "server-only";

import { cache } from "react";
import { createCmsGateway } from "./cms-gateway";
import { getCmsConfig } from "./env";

const PAGE_REVALIDATE_SECONDS = 300;
const DEFAULT_TIMEOUT_MS = 10000;

const config = getCmsConfig();

export const cms = createCmsGateway({
  baseUrl: config.strapiUrl,
  token: config.strapiToken,
  timeoutMs: DEFAULT_TIMEOUT_MS,
  cache: {
    dedupe: (fn) => cache(fn),
    fetchInit: (tags) => ({
      next: { revalidate: PAGE_REVALIDATE_SECONDS, tags },
    }),
  },
});
