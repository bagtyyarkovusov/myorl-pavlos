import { test, expect } from "@playwright/test";

const searchEnabled = process.env.SEARCH_ENABLED === "true";

test.describe("search overlay — desktop", () => {
  test.skip(!searchEnabled, "Search is not enabled (requires Meilisearch)");

  test.use({ javaScriptEnabled: true });

  test("search icon opens overlay with input focused", async ({ page }) => {
    await page.goto("/el");
    const searchButton = page.locator('button[aria-label="Αναζήτηση"]');
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    const overlay = page.locator("#search-overlay");
    await expect(overlay).toBeVisible();

    const input = overlay.locator('input[type="search"]');
    await expect(input).toBeFocused();
  });

  test("typing 2+ characters shows results", async ({ page }) => {
    await page.goto("/el");
    await page.locator('button[aria-label="Αναζήτηση"]').click();

    const input = page.locator("#search-overlay input[type='search']");
    await input.fill("ωτορινολαρυγγολογία");
    await page.waitForTimeout(500);

    await expect(page.locator("#search-overlay a[href*='/el/']").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("clicking result navigates to correct URL", async ({ page }) => {
    await page.goto("/el");
    await page.locator('button[aria-label="Αναζήτηση"]').click();

    const input = page.locator("#search-overlay input[type='search']");
    await input.fill("ωτορινολαρυγγολογία");
    await page.waitForTimeout(500);

    const firstResult = page.locator("#search-overlay a").first();
    await expect(firstResult).toBeVisible({ timeout: 5000 });

    const href = await firstResult.getAttribute("href");
    await firstResult.click();
    await page.waitForURL(`**${href}`);
  });

  test('"See all N results" links to search-results page', async ({ page }) => {
    await page.goto("/el");
    await page.locator('button[aria-label="Αναζήτηση"]').click();

    const input = page.locator("#search-overlay input[type='search']");
    await input.fill("ωτορινολαρυγγολογία");
    await page.waitForTimeout(500);

    const seeAll = page.locator("#search-overlay a").filter({ hasText: /Δείτε όλα τα/ });
    await expect(seeAll).toBeVisible({ timeout: 5000 });

    const href = await seeAll.getAttribute("href");
    expect(href).toContain("/el/search-results?q=");
  });

  test("Escape closes overlay", async ({ page }) => {
    await page.goto("/el");
    await page.locator('button[aria-label="Αναζήτηση"]').click();
    await expect(page.locator("#search-overlay")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("#search-overlay")).not.toBeVisible();
  });

  test("click outside closes overlay", async ({ page }) => {
    await page.goto("/el");
    await page.locator('button[aria-label="Αναζήτηση"]').click();
    await expect(page.locator("#search-overlay")).toBeVisible();

    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#search-overlay")).not.toBeVisible();
  });
});
