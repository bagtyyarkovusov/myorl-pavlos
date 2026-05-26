import { describe } from "vitest";
import type { Rule } from "eslint";
import { RuleTester } from "eslint";
 
import rawRule from "./eslint-rules/no-force-dynamic-export.mjs";

const rule = rawRule as unknown as Rule.RuleModule;

describe("no-force-dynamic-export", () => {
  const ruleTester = new RuleTester();

  ruleTester.run("local/no-force-dynamic-export", rule, {
    valid: [
      {
        code: 'export const dynamic = "force-dynamic";',
        filename: "src/app/[locale]/search-results/page.tsx",
      },
      {
        code: 'export const dynamic = "force-dynamic";',
        filename: "src/app/admin/search-analytics/page.tsx",
      },
      {
        code: "export const revalidate = 600;",
        filename: "src/app/[locale]/[slug]/page.tsx",
      },
      {
        code: 'export const dynamic = "auto";',
        filename: "src/app/[locale]/page.tsx",
      },
      {
        code: 'const dynamic = "force-dynamic";',
        filename: "src/app/[locale]/page.tsx",
      },
    ],
    invalid: [
      {
        code: 'export const dynamic = "force-dynamic";',
        filename: "src/app/[locale]/page.tsx",
        errors: [{ messageId: "noForceDynamic" }],
      },
      {
        code: 'export const dynamic = "force-dynamic";',
        filename: "src/app/[locale]/layout.tsx",
        errors: [{ messageId: "noForceDynamic" }],
      },
      {
        code: 'export const dynamic = "force-dynamic";',
        filename: "src/app/[locale]/[slug]/page.tsx",
        errors: [{ messageId: "noForceDynamic" }],
      },
    ],
  });
});
