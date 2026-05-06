import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CMS_DIR = path.resolve(__dirname);

function readFile(filename: string): string {
  return readFileSync(path.join(CMS_DIR, filename), "utf-8");
}

function hasJSDocBefore(fileContent: string, identifier: string): boolean {
  const pattern = new RegExp(
    `/\\*\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/\\s*(?:export\\s+(?:async\\s+)?(?:function|const|interface|type|\\{)\\s+)?${identifier}`,
  );
  return pattern.test(fileContent);
}

describe("CMS layer JSDoc coverage", () => {
  const pageNormalizer = readFile("page-normalizer.ts");
  const cmsPopulate = readFile("cms-populate.ts");
  const pageParsers = readFile("page-parsers.ts");
  const cmsGateway = readFile("cms-gateway.ts");
  const cmsApi = readFile("cms-api.ts");
  const metadata = readFile("metadata.ts");
  const navigation = readFile("navigation.ts");
  const errors = readFile("errors.ts");
  const env = readFile("env.ts");
  const tabBar = readFile("tab-bar.ts");
  const social = readFile("social.ts");
  const client = readFile("client.ts");

  describe("page-normalizer.ts", () => {
    it.each([
      ["toPageDTO"],
      ["toMediaDTO"],
      ["toSeoDTO"],
      ["toPageRefDTO"],
      ["toTagDTO"],
      ["toSemanticSections"],
      ["isFrontendNativeSystemLayout"],
      ["normalizeOptionalText"],
      ["optionalString"],
      ["deriveSeoTitle"],
    ])("%s has JSDoc", (name) => {
      expect(hasJSDocBefore(pageNormalizer, name)).toBe(true);
    });
  });

  describe("cms-populate.ts", () => {
    it.each([["PAGE_POPULATE"], ["NAVIGATION_POPULATE"], ["SITEMAP_POPULATE"]])(
      "%s has JSDoc",
      (name) => {
        expect(hasJSDocBefore(cmsPopulate, name)).toBe(true);
      },
    );
  });

  describe("page-parsers.ts", () => {
    it.each([["pageResponseSchema"], ["pageListSchema"]])("%s has JSDoc", (name) => {
      expect(hasJSDocBefore(pageParsers, name)).toBe(true);
    });
  });

  describe("cms-gateway.ts", () => {
    it.each([
      ["createCmsGateway"],
      ["CmsGateway"],
      ["FetchOneOptions"],
      ["FetchAllOptions"],
      ["CmsGatewayCacheConfig"],
      ["CmsGatewayConfig"],
    ])("%s has JSDoc", (name) => {
      expect(hasJSDocBefore(cmsGateway, name)).toBe(true);
    });
  });

  describe("cms-api.ts", () => {
    it.each([
      ["getPage"],
      ["getSite"],
      ["getSitemapPages"],
      ["getPageResult"],
      ["PageResult"],
      ["SiteContext"],
      ["injectCmsGatewayForTesting"],
    ])("%s has JSDoc", (name) => {
      expect(hasJSDocBefore(cmsApi, name)).toBe(true);
    });
  });

  describe("metadata.ts", () => {
    it("toPageMetadata has JSDoc", () => {
      expect(hasJSDocBefore(metadata, "toPageMetadata")).toBe(true);
    });
  });

  describe("navigation.ts", () => {
    it.each([
      ["buildNavigationTree"],
      ["hrefForPage"],
      ["hrefForLocaleSlug"],
      ["toLocalizationList"],
    ])("%s has JSDoc", (name) => {
      expect(hasJSDocBefore(navigation, name)).toBe(true);
    });
  });

  describe("errors.ts", () => {
    it.each([["CmsErrorKind"], ["CmsError"], ["isTimeoutError"]])("%s has JSDoc", (name) => {
      expect(hasJSDocBefore(errors, name)).toBe(true);
    });
  });

  describe("env.ts", () => {
    it.each([["CmsConfig"], ["getCmsConfig"]])("%s has JSDoc", (name) => {
      expect(hasJSDocBefore(env, name)).toBe(true);
    });
  });

  describe("tab-bar.ts", () => {
    it("getTabBarNodes has JSDoc", () => {
      expect(hasJSDocBefore(tabBar, "getTabBarNodes")).toBe(true);
    });
  });

  describe("social.ts", () => {
    it.each([["deriveSocialPlatform"], ["toSocialLinkDTO"]])("%s has JSDoc", (name) => {
      expect(hasJSDocBefore(social, name)).toBe(true);
    });
  });

  describe("client.ts", () => {
    it.each([["fetchNavigation"], ["injectFetchNavigationGatewayForTesting"]])(
      "%s has JSDoc",
      (name) => {
        expect(hasJSDocBefore(client, name)).toBe(true);
      },
    );
  });
});
