import { test, expect } from "@playwright/test";

test.describe("Interior design system", () => {
  test.describe("Standard page", () => {
    test("desktop @desktop", async ({ page }) => {
      await page.goto("/el/iatriko-simeioma");
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot("standard-page-desktop.png", {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });

    test("mobile @mobile", async ({ page }) => {
      await page.goto("/el/iatriko-simeioma");
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot("standard-page-mobile.png", {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });
  });

  test.describe("Contact page", () => {
    test("desktop @desktop", async ({ page }) => {
      await page.goto("/el/epikoinonia");
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot("contact-page-desktop.png", {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });

    test("mobile @mobile", async ({ page }) => {
      await page.goto("/el/epikoinonia");
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot("contact-page-mobile.png", {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });
  });

  test.describe("Appointment page", () => {
    test("desktop @desktop", async ({ page }) => {
      await page.goto("/el/rantevou");
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot("appointment-page-desktop.png", {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });

    test("mobile @mobile", async ({ page }) => {
      await page.goto("/el/rantevou");
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot("appointment-page-mobile.png", {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });
  });

  test.describe("PageHeader accent", () => {
    test("renders accent hairline on interior pages @desktop", async ({ page }) => {
      await page.goto("/el/iatriko-simeioma");
      await page.waitForTimeout(2000);
      const accent = page.locator("[data-accent]");
      await expect(accent).toBeVisible();
    });
  });

  test.describe("SectionTabBar", () => {
    test("renders tab navigation for parent pages @desktop", async ({ page }) => {
      await page.goto("/el/yperesies");
      await page.waitForTimeout(2000);
      const tabBar = page.locator("nav[aria-label='Section navigation']");
      if (await tabBar.isVisible()) {
        await expect(tabBar).toHaveScreenshot("section-tab-bar.png", {
          maxDiffPixels: 100,
        });
      }
    });
  });
});
