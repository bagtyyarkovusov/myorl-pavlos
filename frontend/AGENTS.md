<!-- BEGIN:nextjs-agent-rules -->

For project-wide context (ADRs, Obsidian MOCs), see the repo [`.cursor/rules/`](../.cursor/rules) and [docs/obsidian/](../docs/obsidian/).

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Playwright — UI Design Feedback

### When to use Playwright

| Trigger                                            | Action                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| User asks "how does X look?" or "check the design" | Run `npm run e2e` then read the screenshots in `playwright-report/` |
| User asks to compare visual changes                | Run tests, then `npm run e2e:report`                                |
| User modifies component styles                     | Run the relevant test with `--grep`, read the screenshot            |
| User wants interactive debugging                   | Run `npm run e2e:ui`                                                |

### Commands

```bash
npm run e2e                    # Run all E2E tests (headless)
npm run e2e:ui                 # Interactive UI mode (watch, debug, pick tests)
npm run e2e:report             # Open HTML report after a test run
npm run e2e -- --grep "home"   # Run only tests matching "home"
npm run e2e -- --project=desktop  # Run only desktop viewport
```

### Visual snapshot workflow

1. **First run** — `npm run e2e` generates baseline screenshots (no comparison)
2. **Subsequent runs** — Playwright diffs against baselines using `toHaveScreenshot()`
3. **Review diffs** — `npm run e2e:report` opens HTML report with side-by-side comparison
4. **Update baselines** — `npm run e2e -- --update-snapshots` when changes are intentional

### Adding new page tests

1. Create `e2e/pages/<name>.spec.ts`
2. Use `@desktop` and `@mobile` tags to match viewport projects
3. Use `toHaveScreenshot()` with `fullPage: true` for full-page captures
4. Use `waitForTimeout(2000)` to let framer-motion animations settle

### Prerequisites

Strapi CMS must be running for CMS-dependent pages (`/el`, `/el/<slug>`). Start with:

```bash
npm run dev:local   # from repo root — starts Strapi + Next.js
```
