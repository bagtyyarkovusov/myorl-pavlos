import { test, expect } from "@playwright/test";

test.describe("Web Vitals telemetry", () => {
  test("desktop @desktop — posts vitals metrics on page load", async ({ page }) => {
    let requestBody: unknown = null;

    await page.route("**/api/web-vitals", (route) => {
      if (route.request().method() === "POST") {
        requestBody = route.request().postDataJSON();
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    await page.goto("/el");
    await page.waitForLoadState("networkidle");

    // Wait for web-vitals to fire — metrics report within a few seconds.
    // LCP fires after the largest contentful paint; TTFB/FCP fire earlier.
    // CLS may fire later on user interaction, but we're checking that at
    // least one metric was posted within the timeout.
    await expect
      .poll(() => requestBody, { timeout: 15_000, intervals: [500, 1000, 2000] })
      .not.toBeNull();

    const body = requestBody as { metrics: unknown[] };
    expect(body.metrics).toBeTruthy();
    expect(Array.isArray(body.metrics)).toBe(true);
    expect(body.metrics.length).toBeGreaterThanOrEqual(1);

    const firstMetric = body.metrics[0] as Record<string, unknown>;
    expect(firstMetric.metric).toBeTruthy();
    expect(["LCP", "CLS", "INP", "FCP", "TTFB"]).toContain(firstMetric.metric);
    expect(typeof firstMetric.value).toBe("number");
    expect(firstMetric.value).toBeGreaterThanOrEqual(0);
    expect(typeof firstMetric.path).toBe("string");
    expect(firstMetric.path).toContain("/");
    expect(["el", "ru"]).toContain(firstMetric.locale);
    expect(["mobile", "desktop", "tablet"]).toContain(firstMetric.device_type);
    expect(typeof firstMetric.session_id).toBe("string");
    expect(firstMetric.session_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test("mobile @mobile — posts vitals metrics on page load", async ({ page }) => {
    let requestBody: unknown = null;

    await page.route("**/api/web-vitals", (route) => {
      if (route.request().method() === "POST") {
        requestBody = route.request().postDataJSON();
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    await page.goto("/el");
    await page.waitForLoadState("networkidle");

    await expect
      .poll(() => requestBody, { timeout: 15_000, intervals: [500, 1000, 2000] })
      .not.toBeNull();

    const body = requestBody as { metrics: unknown[] };
    expect(body.metrics.length).toBeGreaterThanOrEqual(1);

    const firstMetric = body.metrics[0] as Record<string, unknown>;
    expect(firstMetric.device_type).toBe("mobile");
  });
});
