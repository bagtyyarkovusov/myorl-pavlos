import { test, expect } from "@playwright/test";

const ACCORDION_PAGE_SLUG = process.env.E2E_ACCORDION_SLUG || "geniki-anaisthisia-gia-to-paidi-sas";
const ACCORDION_LOCALE = process.env.E2E_ACCORDION_LOCALE || "ru";

test.describe("Accordion content page", () => {
  test("desktop @desktop", async ({ page }) => {
    await page.goto(`/${ACCORDION_LOCALE}/${ACCORDION_PAGE_SLUG}`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot("accordion-page-desktop.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("mobile @mobile", async ({ page }) => {
    await page.goto(`/${ACCORDION_LOCALE}/${ACCORDION_PAGE_SLUG}`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot("accordion-page-mobile.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});
