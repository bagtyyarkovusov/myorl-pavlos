#!/usr/bin/env node

import { chromium } from "@playwright/test";

const defaultSlugs = [
  "/ru/roxalito-ypniki-apnoia",
  "/ru/antimetopisi-roxalitou",
  "/ru/allergiki-rinitida",
];

const baseUrl = (
  process.env.ARTICLE_RESPONSIVE_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const slugs = (process.env.ARTICLE_RESPONSIVE_SLUGS || defaultSlugs.join(","))
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);

const viewport = { width: 390, height: 844 };
const tolerance = 1;

function toUrl(slug) {
  if (/^https?:\/\//i.test(slug)) {
    return slug;
  }

  return `${baseUrl}${slug.startsWith("/") ? slug : `/${slug}`}`;
}

function formatFailures(url, failures) {
  return [`${url}:`, ...failures.map((failure) => `  - ${failure}`)].join("\n");
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
});

const results = [];

for (const slug of slugs) {
  const url = toUrl(slug);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator("main").first().waitFor({ state: "visible", timeout: 15000 });

  const failures = await page.evaluate((allowedOverflow) => {
    const viewportWidth = window.innerWidth;
    const checks = [];

    if (document.body.scrollWidth > viewportWidth + allowedOverflow) {
      checks.push(
        `body scrollWidth ${document.body.scrollWidth}px exceeds viewport ${viewportWidth}px`,
      );
    }

    const htmlRoot = document.documentElement;
    if (htmlRoot.scrollWidth > viewportWidth + allowedOverflow) {
      checks.push(
        `document scrollWidth ${htmlRoot.scrollWidth}px exceeds viewport ${viewportWidth}px`,
      );
    }

    for (const cmsHtml of document.querySelectorAll(".cms-html")) {
      const rect = cmsHtml.getBoundingClientRect();
      if (rect.left < -allowedOverflow || rect.right > viewportWidth + allowedOverflow) {
        checks.push(
          `.cms-html escapes viewport: left ${rect.left.toFixed(1)}px, right ${rect.right.toFixed(
            1,
          )}px, viewport ${viewportWidth}px`,
        );
      }

      for (const media of cmsHtml.querySelectorAll("img, figure, iframe, video")) {
        const mediaRect = media.getBoundingClientRect();
        if (mediaRect.right > viewportWidth + allowedOverflow) {
          checks.push(
            `${media.tagName.toLowerCase()} escapes viewport: right ${mediaRect.right.toFixed(
              1,
            )}px, viewport ${viewportWidth}px`,
          );
        }
      }

      for (const table of cmsHtml.querySelectorAll("table")) {
        const tableRect = table.getBoundingClientRect();
        if (tableRect.left < rect.left - allowedOverflow) {
          checks.push(
            `table begins outside prose: table left ${tableRect.left.toFixed(
              1,
            )}px, prose left ${rect.left.toFixed(1)}px`,
          );
        }

        if (tableRect.right > rect.right + allowedOverflow) {
          checks.push(
            `table expands prose: table right ${tableRect.right.toFixed(
              1,
            )}px, prose right ${rect.right.toFixed(1)}px`,
          );
        }
      }
    }

    return checks;
  }, tolerance);

  results.push({ url, failures });
}

await browser.close();

const failed = results.filter((result) => result.failures.length > 0);

if (failed.length > 0) {
  console.error(failed.map((result) => formatFailures(result.url, result.failures)).join("\n\n"));
  process.exit(1);
}

console.log(`Article responsive checks passed for ${results.length} page(s) at ${baseUrl}`);
