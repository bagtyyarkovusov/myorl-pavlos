# Plan: Frontend Design Token Cleanup

> Source PRD: GitHub issue #41. Child issues: #42, #44, #43, #45, #46, #47, #48.

## Architectural decisions

- **Baseline**: Treat the current dirty worktree as the implementation baseline. Preserve unrelated backend, deployment, and migration changes.
- **Review structure**: Prepare one PR per child issue, in dependency order: #42, #44, #43, #45, #46, #47, #48.
- **Styling ownership**: Tailwind v4 utilities are canonical in JSX; CSS Modules own complex selectors, animation, state, and responsive component systems; global CSS owns only tokens, base styles, layout helpers, visibility helpers, and CMS prose.
- **Token contract**: Theme colors are the canonical palette; semantic aliases are only for CSS roles such as background, foreground, muted, line, surface, and accent.
- **Out of scope**: No backend schema, CMS DTO, route, localization, data fetching, component-library, or visual redesign changes.
- **Safety gates**: Run GitNexus impact before editing symbols and `npx gitnexus detect-changes --repo gemini-export` before committing.

---

## Phase 1: Canonical Token Contract

**User stories**: 1, 4, 5, 6, 7, 12, 16, 18, 20, 23

### What to build

Document the canonical token vocabulary and style ownership rules, map undefined token names to replacements, and migrate `PageSection` as the first narrow consuming surface.

### Acceptance criteria

- [ ] Contributor-visible token documentation exists.
- [ ] Informal token names are mapped to canonical replacements.
- [ ] `PageSection` uses canonical Tailwind utilities in JSX.
- [ ] Current format and lint blockers are fixed without behavior changes.

---

## Phase 2: Shared CTA Normalization

**User stories**: 2, 10, 14, 15, 21, 24

### What to build

Normalize shared CTA variants behind a small, testable class-composition boundary while preserving internal and external link behavior.

### Acceptance criteria

- [ ] `ButtonLink` variants use canonical token utilities.
- [ ] Caller classes merge through `cn()`.
- [ ] Header CTA keeps existing labels, external link behavior, and responsive label behavior.
- [ ] Tests cover internal links, external links, variants, and class merging.

---

## Phase 3: Home Section Token Migration

**User stories**: 1, 2, 4, 5, 6, 8, 17, 21

### What to build

Replace undefined and informal token references in home sections with the canonical token contract while preserving layout, rendered content, media, hover states, and responsive behavior.

### Acceptance criteria

- [ ] Home sections no longer reference undefined token names.
- [ ] Token replacements follow the documented contract.
- [ ] Existing home behavior and rendered content remain unchanged.
- [ ] Hero, cards, CTAs, media frames, and hover states are manually checked.

---

## Phase 4: Card and Media Stabilization

**User stories**: 2, 8, 11, 14, 17, 19, 21

### What to build

Consolidate repeated card shell, media surface, index badge, and link text class decisions where token drift is visible, without forcing one-off layouts into a generic abstraction.

### Acceptance criteria

- [ ] Repeated card shell styles use canonical tokens and no undefined variables.
- [ ] Repeated media frame and placeholder styles use canonical tokens.
- [ ] Layout, content, hover behavior, and responsive behavior are preserved.

---

## Phase 5: Header CSS Module Token Pass

**User stories**: 3, 9, 15, 17, 21, 24, 25

### What to build

Keep the header, desktop navigation, and mobile drawer as a CSS Module style island while aligning token usage to the canonical contract.

### Acceptance criteria

- [ ] Header CSS Module uses canonical semantic aliases or palette variables.
- [ ] Desktop navigation open and hover behavior remains unchanged.
- [ ] Mobile drawer open and close behavior remains unchanged.
- [ ] Locale-specific header typography and CTA behavior remain stable.

---

## Phase 6: CMS Prose and Global Boundaries

**User stories**: 12, 13, 15, 18, 24, 25

### What to build

Keep sanitized rich text styling globally available while preserving the boundary between global styles, component styles, CSS Modules, and Tailwind utilities.

### Acceptance criteria

- [ ] CMS prose styles remain globally available.
- [ ] Global CSS remains limited to documented responsibilities.
- [ ] Tests assert stable public prose wrapper behavior where applicable.

---

## Phase 7: Verification and Closeout

**User stories**: 15, 16, 17, 21, 24, 25

### What to build

Run automated checks and manually inspect the highest-risk visual surfaces before closing the parent PRD.

### Acceptance criteria

- [ ] `npm run format:check --prefix frontend` passes.
- [ ] `npm run lint --prefix frontend` passes.
- [ ] `npm run typecheck --prefix frontend` passes.
- [ ] `npm run test --prefix frontend` passes.
- [ ] `npm run build --prefix frontend` passes.
- [ ] `npx gitnexus detect-changes --repo gemini-export` is reviewed.
- [ ] Home, standard content pages, appointment/contact, desktop navigation, mobile drawer, hero media, cards, CTAs, and CMS prose are manually checked.
