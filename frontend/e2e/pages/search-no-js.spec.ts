import { test, expect } from "@playwright/test";

const searchEnabled = process.env.SEARCH_ENABLED === "true";

test.describe("search results — no JS", () => {
  test.skip(!searchEnabled, "Search is not enabled (requires Meilisearch)");

  test.use({ javaScriptEnabled: false });

  test("form submission loads SSR results", async ({ page }) => {
    await page.goto("/el/search-results");
    await page.fill('input[name="q"]', "ωτορινολαρυγγολογία");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/search-results?q=*");
    await expect(page.locator("h1")).toContainText("ωτορινολαρυγγολογία");
  });

  test("pagination links navigate via URL", async ({ page }) => {
    await page.goto("/el/search-results?q=ωτορινολαρυγγολογία");
    const page2Link = page.locator('nav[aria-label="pagination"] a').filter({ hasText: "2" });
    if (await page2Link.isVisible()) {
      await page2Link.click();
      await page.waitForURL("**/search-results?q=*&page=2*");
      await expect(page.locator("h1")).toContainText("ωτορινολαρυγγολογία");
    }
  });

  test("filter links navigate via URL", async ({ page }) => {
    await page.goto("/el/search-results?q=ωτορινολαρυγγολογία");
    const articleLink = page.locator("a").filter({ hasText: "Άρθρα" });
    if (await articleLink.isVisible()) {
      await articleLink.click();
      await page.waitForURL("**/search-results?q=*&type=page*");
    }
  });
});
