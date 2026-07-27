import { expect, test } from "@playwright/test";

test.describe("homepage resource groups — desktop", () => {
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
});
