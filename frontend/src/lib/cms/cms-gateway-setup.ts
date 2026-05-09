import "server-only";

import { cache } from "react";
import { createCmsGateway, type CmsGateway } from "./cms-gateway";
import { getCmsConfig } from "./env";

const PAGE_REVALIDATE_SECONDS = 300;
const DEFAULT_TIMEOUT_MS = 10000;

// Lazy singleton: env validation is deferred to first method access so the
// gateway module can be imported by routes (e.g. /_not-found) that never
// actually issue a CMS request and therefore should not require STRAPI_URL.
let instance: CmsGateway | null = null;

function getInstance(): CmsGateway {
  if (instance) {
    return instance;
  }
  const config = getCmsConfig();
  instance = createCmsGateway({
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
  return instance;
}

export const cms: CmsGateway = new Proxy({} as CmsGateway, {
  get(_target, prop, receiver) {
    return Reflect.get(getInstance() as object, prop, receiver);
  },
});
