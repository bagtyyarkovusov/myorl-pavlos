import { expect, test } from "@playwright/test";

test.describe("homepage resource groups — desktop", () => {
  test("promo carousel has breathing room below the navigation", async ({ page }) => {
    await page.goto("/ru");

    const promoSection = page.locator("main section").first();
    const activeSlide = promoSection.locator('[role="tabpanel"]');
    const [sectionBox, slideBox] = await Promise.all([
      promoSection.boundingBox(),
      activeSlide.boundingBox(),
    ]);

    expect(sectionBox).not.toBeNull();
    expect(slideBox).not.toBeNull();
    expect(slideBox!.y - sectionBox!.y).toBeGreaterThanOrEqual(12);
  });

  test("long Russian service titles do not overlap their images", async ({ page }) => {
    await page.setViewportSize({ width: 1163, height: 985 });
    await page.goto("/ru");

    const servicesSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Услуги", exact: true }),
    });
    const title = servicesSection.getByRole("heading", {
      name: "Аденотомия (аденоиды) классическое и эндоскопическое удаление аденоидов",
      exact: true,
    });
    const body = title.locator("..");
    const card = body.locator("..");
    const image = card.locator("img");

    const [imageBox, bodyBox] = await Promise.all([image.boundingBox(), body.boundingBox()]);

    expect(imageBox).not.toBeNull();
    expect(bodyBox).not.toBeNull();
    expect(imageBox!.x + imageBox!.width).toBeLessThanOrEqual(bodyBox!.x);
  });

  test("map activation shows and links to the real Alexandras clinic location", async ({
    page,
  }) => {
    await page.goto("/ru");
    await page.getByRole("button", { name: "Показать карту", exact: true }).click();

    await expect(page.locator('iframe[src*="maps.google.com"]')).toHaveAttribute(
      "src",
      /37\.9873467%2C23\.7580431/,
    );
    await expect(page.getByRole("link", { name: "Открыть в Google Maps" })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=37.9873467%2C23.7580431",
    );
  });
});
