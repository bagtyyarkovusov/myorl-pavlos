import { test, expect } from "@playwright/test";

const INTERNAL_301_SOURCE = process.env.E2E_URL_MAP_301_SOURCE;
const INTERNAL_301_DEST = process.env.E2E_URL_MAP_301_DEST;
const EXTERNAL_301_SOURCE = process.env.E2E_URL_MAP_EXTERNAL_SOURCE;
const EXTERNAL_301_DEST = process.env.E2E_URL_MAP_EXTERNAL_DEST;
const GONE_410_PATH = process.env.E2E_URL_MAP_GONE_PATH;

test.describe("URL Mapping — internal 301", () => {
  test("redirects legacy path to canonical destination with HTTP 301", async ({ request }) => {
    test.skip(
      !INTERNAL_301_SOURCE || !INTERNAL_301_DEST,
      "Set E2E_URL_MAP_301_SOURCE and E2E_URL_MAP_301_DEST to enable",
    );

    const response = await request.get(INTERNAL_301_SOURCE!, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(301);
    expect(response.headers()["location"]).toBe(INTERNAL_301_DEST);
  });
});

test.describe("URL Mapping — external 301", () => {
  test("redirects legacy path to external URL with HTTP 301", async ({ request }) => {
    test.skip(
      !EXTERNAL_301_SOURCE || !EXTERNAL_301_DEST,
      "Set E2E_URL_MAP_EXTERNAL_SOURCE and E2E_URL_MAP_EXTERNAL_DEST to enable",
    );

    const response = await request.get(EXTERNAL_301_SOURCE!, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(301);
    expect(response.headers()["location"]).toBe(EXTERNAL_301_DEST);
  });
});

test.describe("URL Mapping — gone 410", () => {
  test("returns HTTP 410 for a retired page path", async ({ request }) => {
    test.skip(!GONE_410_PATH, "Set E2E_URL_MAP_GONE_PATH to enable");

    const response = await request.get(GONE_410_PATH!);
    expect(response.status()).toBe(410);
  });

  test("includes noindex meta tag on 410 page", async ({ page }) => {
    test.skip(!GONE_410_PATH, "Set E2E_URL_MAP_GONE_PATH to enable");

    const response = await page.goto(GONE_410_PATH!);
    expect(response?.status()).toBe(410);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  });

  test("renders search form on 410 page", async ({ page }) => {
    test.skip(!GONE_410_PATH, "Set E2E_URL_MAP_GONE_PATH to enable");

    await page.goto(GONE_410_PATH!);
    await expect(page.locator('form[role="search"]')).toBeVisible();
    await expect(page.locator('input[name="q"]')).toBeVisible();
  });

  test("renders home page links on 410 page", async ({ page }) => {
    test.skip(!GONE_410_PATH, "Set E2E_URL_MAP_GONE_PATH to enable");

    await page.goto(GONE_410_PATH!);
    await expect(page.getByRole("link", { name: /Αρχική/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Главная/ })).toBeVisible();
  });
});

test.describe("URL Mapping — Unicode normalization", () => {
  test("percent-encoded Unicode path matches legacyPath lookup", async ({ request }) => {
    test.skip(
      !INTERNAL_301_SOURCE || !INTERNAL_301_DEST,
      "Set E2E_URL_MAP_301_SOURCE and E2E_URL_MAP_301_DEST to enable — use a legacy path that is already percent-encoded for the request",
    );

    // Percent-encode the source to simulate a raw browser request that
    // percent-encodes non-ASCII characters. The proxy and redirect pipeline
    // must match the decoded form stored in legacyPath.
    const encoded = encodeURIComponent(INTERNAL_301_SOURCE!.replace(/^\//, "")).replace(
      /%2F/g,
      "/",
    );
    const response = await request.get(`/${encoded}`, {
      maxRedirects: 0,
    });

    // Should still 301 to the expected destination — the pipeline normalises
    // percent-encoded input to the decoded Unicode form stored in Strapi.
    expect(response.status()).toBe(301);
    expect(response.headers()["location"]).toBe(INTERNAL_301_DEST);
  });
});
