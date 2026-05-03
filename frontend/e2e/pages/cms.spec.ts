import { test, expect } from "@playwright/test";

const CMS_PAGE_SLUG = process.env.E2E_CMS_SLUG || "iatriko-simeioma";

test.describe("CMS content page", () => {
  test("desktop @desktop", async ({ page }) => {
    await page.goto(`/el/${CMS_PAGE_SLUG}`);
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("cms-page-desktop.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("mobile @mobile", async ({ page }) => {
    await page.goto(`/el/${CMS_PAGE_SLUG}`);
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("cms-page-mobile.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});
