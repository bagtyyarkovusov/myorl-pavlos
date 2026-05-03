import { test, expect } from "@playwright/test";

test.describe("Home page — /el", () => {
  test("desktop @desktop", async ({ page }) => {
    await page.goto("/el");
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("home-desktop.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("mobile @mobile", async ({ page }) => {
    await page.goto("/el");
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("home-mobile.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});
