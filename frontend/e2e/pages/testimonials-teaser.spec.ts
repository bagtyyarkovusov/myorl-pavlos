import { test, expect, type Page } from "@playwright/test";

/**
 * Measures and reports spacing between testimonials teaser components.
 * Use this test to verify parent-child spacing, alignment, and padding.
 */

async function getBox(page: Page, selector: string) {
  const el = page.locator(selector).first();
  const count = await el.count();
  if (count === 0) return null;
  return el.boundingBox();
}

function distanceY(
  a: { y: number; height: number } | null,
  b: { y: number } | null,
): number | null {
  if (!a || !b) return null;
  return Math.round(b.y - (a.y + a.height));
}

function distanceX(a: { x: number; width: number } | null, b: { x: number } | null): number | null {
  if (!a || !b) return null;
  return Math.round(b.x - (a.x + a.width));
}

function report(name: string, measurements: Record<string, unknown>) {
  console.log(`\n=== ${name} ===`);

  console.log(JSON.stringify(measurements, null, 2));
}

test.describe("Testimonials teaser spacing audit", () => {
  const path = "/el";

  test("desktop @desktop", async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    // Key selectors — use text/structure rather than hashed CSS module classes
    const section = await getBox(page, 'section:has(h2:has-text("Google Maps"))');
    const heading = await getBox(page, 'h2:has-text("Google Maps")');
    const ratingBar = await getBox(
      page,
      'section:has(h2:has-text("Google Maps")) .inline-flex:has-text("★")',
    );
    const grid = await getBox(page, 'section:has(h2:has-text("Google Maps")) ul[role="list"]');
    const actions = await getBox(
      page,
      'section:has(h2:has-text("Google Maps")) >> div:has(> a):has-text("Google Maps")',
    );

    // If testimonials are missing (CMS-dependent), skip gracefully
    if (!heading || !grid) {
      test.info().skip(true, "Testimonials section not rendered — CMS data may be missing");
      return;
    }

    const cardLocator = page.locator(
      'section:has(h2:has-text("Google Maps")) ul[role="list"] > li',
    );
    const cardCount = await cardLocator.count();

    const measurements = {
      viewport: { width: 1280, height: 720 },
      section,
      heading,
      ratingBar,
      grid,
      actions,
      distances: {
        headingToRating: distanceY(heading, ratingBar),
        ratingToGrid: distanceY(ratingBar, grid),
        gridToActions: distanceY(grid, actions),
      },
      cards: [] as Array<{
        index: number;
        cardBox: Awaited<ReturnType<typeof getBox>>;
        textBox: Awaited<ReturnType<typeof getBox>>;
        metaBox: Awaited<ReturnType<typeof getBox>>;
        textToMeta: number | null;
        cardPaddingTop: number | null;
        cardPaddingBottom: number | null;
      }>,
    };

    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      const card = cardLocator.nth(i);
      const cardBox = await card.boundingBox();
      // Text is the first <p> inside the blockquote (or inside a div inside blockquote)
      const textBox = await card.locator("blockquote p").first().boundingBox();
      const metaBox = await card.locator("blockquote footer, blockquote p").last().boundingBox();

      measurements.cards.push({
        index: i,
        cardBox,
        textBox,
        metaBox,
        textToMeta: distanceY(textBox, metaBox),
        cardPaddingTop: textBox && cardBox ? Math.round(textBox.y - cardBox.y) : null,
        cardPaddingBottom:
          metaBox && cardBox
            ? Math.round(cardBox.y + cardBox.height - (metaBox.y + metaBox.height))
            : null,
      });
    }

    report("DESKTOP MEASUREMENTS", measurements);

    // Soft assertions for spacing guidelines
    expect.soft(measurements.distances.headingToRating).toBeGreaterThanOrEqual(16);
    expect.soft(measurements.distances.ratingToGrid).toBeGreaterThanOrEqual(16);
    expect.soft(measurements.distances.gridToActions).toBeGreaterThanOrEqual(16);

    for (const card of measurements.cards) {
      if (
        card.cardPaddingTop == null ||
        card.cardPaddingBottom == null ||
        card.textToMeta == null
      ) {
        continue;
      }
      expect.soft(card.cardPaddingTop).toBeGreaterThanOrEqual(16);
      expect.soft(card.cardPaddingBottom).toBeGreaterThanOrEqual(16);
      expect.soft(card.textToMeta).toBeGreaterThanOrEqual(12);
    }
  });

  test("mobile @mobile", async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const section = await getBox(page, 'section:has(h2:has-text("Google Maps"))');
    const heading = await getBox(page, 'h2:has-text("Google Maps")');
    const ratingBar = await getBox(
      page,
      'section:has(h2:has-text("Google Maps")) .inline-flex:has-text("★")',
    );
    const grid = await getBox(page, 'section:has(h2:has-text("Google Maps")) ul[role="list"]');
    const actions = await getBox(
      page,
      'section:has(h2:has-text("Google Maps")) >> div:has(> a):has-text("Google Maps")',
    );

    if (!heading || !grid) {
      test.info().skip(true, "Testimonials section not rendered — CMS data may be missing");
      return;
    }

    const cardLocator = page.locator(
      'section:has(h2:has-text("Google Maps")) ul[role="list"] > li',
    );
    const cardCount = await cardLocator.count();

    const measurements = {
      viewport: { width: 390, height: 844 },
      section,
      heading,
      ratingBar,
      grid,
      actions,
      distances: {
        headingToRating: distanceY(heading, ratingBar),
        ratingToGrid: distanceY(ratingBar, grid),
        gridToActions: distanceY(grid, actions),
      },
      cards: [] as Array<{
        index: number;
        cardBox: Awaited<ReturnType<typeof getBox>>;
        textBox: Awaited<ReturnType<typeof getBox>>;
        metaBox: Awaited<ReturnType<typeof getBox>>;
        textToMeta: number | null;
        cardPaddingTop: number | null;
        cardPaddingBottom: number | null;
      }>,
    };

    for (let i = 0; i < Math.min(cardCount, 4); i++) {
      const card = cardLocator.nth(i);
      const cardBox = await card.boundingBox();
      const textBox = await card.locator("blockquote p").first().boundingBox();
      const metaBox = await card.locator("blockquote footer, blockquote p").last().boundingBox();

      measurements.cards.push({
        index: i,
        cardBox,
        textBox,
        metaBox,
        textToMeta: distanceY(textBox, metaBox),
        cardPaddingTop: textBox && cardBox ? Math.round(textBox.y - cardBox.y) : null,
        cardPaddingBottom:
          metaBox && cardBox
            ? Math.round(cardBox.y + cardBox.height - (metaBox.y + metaBox.height))
            : null,
      });
    }

    report("MOBILE MEASUREMENTS", measurements);

    expect.soft(measurements.distances.headingToRating).toBeGreaterThanOrEqual(12);
    expect.soft(measurements.distances.ratingToGrid).toBeGreaterThanOrEqual(12);
    expect.soft(measurements.distances.gridToActions).toBeGreaterThanOrEqual(12);

    for (const card of measurements.cards) {
      if (
        card.cardPaddingTop == null ||
        card.cardPaddingBottom == null ||
        card.textToMeta == null
      ) {
        continue;
      }
      expect.soft(card.cardPaddingTop).toBeGreaterThanOrEqual(12);
      expect.soft(card.cardPaddingBottom).toBeGreaterThanOrEqual(12);
      expect.soft(card.textToMeta).toBeGreaterThanOrEqual(8);
    }
  });
});
