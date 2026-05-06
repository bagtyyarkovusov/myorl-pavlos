/**
 * Auto-generates TypeScript literal unions from Strapi schema definitions.
 *
 * Reads `backend/src/api/page/content-types/page/schema.json` and component
 * schemas, then emits `src/index.ts` with typed unions that both frontend
 * and backend can share.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PAGE_SCHEMA = join(ROOT, "backend", "src", "api", "page", "content-types", "page", "schema.json");
const SEO_COMPONENT = join(ROOT, "backend", "src", "components", "shared", "seo.json");
const OUTFILE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "index.ts");

function toUnionType(name: string, values: string[]): string {
  const lines = values.map((v) => `  | "${v}"`).join("\n");
  return `export type ${name} =\n${lines};`;
}

async function main() {
  const pageSchema = JSON.parse(await readFile(PAGE_SCHEMA, "utf-8"));
  const seoComponent = JSON.parse(await readFile(SEO_COMPONENT, "utf-8"));

  const pageType = toUnionType("PageType", pageSchema.attributes.pageType.enum);

  const layoutVariant = toUnionType(
    "LayoutVariant",
    pageSchema.attributes.layoutVariant.enum,
  );

  const sectionComponent = toUnionType(
    "SectionComponent",
    pageSchema.attributes.pageSections.components,
  );

  const sitemapChangeFrequency = toUnionType(
    "SitemapChangeFrequency",
    seoComponent.attributes.sitemapChangeFrequency.enum,
  );

  const header = `// Auto-generated from Strapi schemas. Do not edit manually.\n// Regenerate via: npm run generate --prefix packages/shared-types\n\n`;

  const renderMode = `// RenderMode is frontend-native and not derived from Strapi schema\nexport type RenderMode = "cms" | "frontend-native";\n`;

  const output =
    header +
    [pageType, layoutVariant, sectionComponent, sitemapChangeFrequency, renderMode].join("\n\n") +
    "\n";

  await writeFile(OUTFILE, output, "utf-8");
  console.log(`[generate] Wrote ${OUTFILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
