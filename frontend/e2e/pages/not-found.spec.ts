import { test, expect } from "@playwright/test";

test.describe("404 page", () => {
  test("returns HTTP 404 for unknown path", async ({ request }) => {
    const response = await request.get("/totally-fake-path");
    expect(response.status()).toBe(404);
  });

  test("includes noindex meta tag", async ({ page }) => {
    const response = await page.goto("/totally-fake-path");
    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  });
});
