import { test, expect } from "@playwright/test";

const searchEnabled = process.env.SEARCH_ENABLED === "true";

test.describe("search overlay — mobile", () => {
  test.skip(!searchEnabled, "Search is not enabled (requires Meilisearch)");

  test.use({ javaScriptEnabled: true });

  test("search icon opens fullscreen overlay @mobile", async ({ page }) => {
    await page.goto("/el");
    const searchButton = page.locator('button[aria-label="Αναζήτηση"]');
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    const overlay = page.locator("#search-overlay");
    await expect(overlay).toBeVisible();

    const box = await overlay.boundingBox();
    expect(box).not.toBeNull();
    // Fullscreen should cover most of the 390×844 viewport
    expect(box!.width).toBeGreaterThanOrEqual(350);
    expect(box!.height).toBeGreaterThanOrEqual(700);
  });

  test("close button dismisses overlay @mobile", async ({ page }) => {
    await page.goto("/el");
    await page.locator('button[aria-label="Αναζήτηση"]').click();

    const overlay = page.locator("#search-overlay");
    await expect(overlay).toBeVisible();

    const closeButton = overlay.locator('button[aria-label="Κλείσιμο"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    await expect(overlay).not.toBeVisible();
  });

  test("input is pinned to top on mobile @mobile", async ({ page }) => {
    await page.goto("/el");
    await page.locator('button[aria-label="Αναζήτηση"]').click();

    const overlay = page.locator("#search-overlay");
    await expect(overlay).toBeVisible();

    const overlayBox = await overlay.boundingBox();
    const input = overlay.locator('input[type="search"]');
    const inputBox = await input.boundingBox();

    expect(overlayBox).not.toBeNull();
    expect(inputBox).not.toBeNull();
    // Input should be near the top of the overlay (within 60px)
    expect(inputBox!.y).toBeLessThanOrEqual(overlayBox!.y + 60);
  });

  test("typing query shows results on mobile @mobile", async ({ page }) => {
    await page.goto("/el");
    await page.locator('button[aria-label="Αναζήτηση"]').click();

    const input = page.locator("#search-overlay input[type='search']");
    await input.fill("ωτορινολαρυγγολογία");
    await page.waitForTimeout(500);

    await expect(page.locator("#search-overlay a[href*='/el/']").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("Escape closes overlay on mobile @mobile", async ({ page }) => {
    await page.goto("/el");
    await page.locator('button[aria-label="Αναζήτηση"]').click();
    await expect(page.locator("#search-overlay")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("#search-overlay")).not.toBeVisible();
  });

  test("overlay with typed query and results screenshot @mobile", async ({ page }) => {
    await page.goto("/el");
    await page.locator('button[aria-label="Αναζήτηση"]').click();

    const input = page.locator("#search-overlay input[type='search']");
    await input.fill("ωτορινολαρυγγολογία");
    await page.waitForTimeout(500);

    await expect(page.locator("#search-overlay")).toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("search-overlay-mobile-results.png", {
      maxDiffPixels: 200,
    });
  });
});
