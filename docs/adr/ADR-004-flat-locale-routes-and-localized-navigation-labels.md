# ADR-004: Use Flat Locale Routes and Localized Menu Titles in Next.js

## Status
Accepted

## Context
Legacy source `uri` values are flat rather than nested, and the live Strapi data still contains localized drift in `parentPage`, `templateId`, `pageType`, and `layoutVariant`. That drift is now documented as source-authentic in most cases, so the frontend should not force a shared cross-locale hierarchy just to make URLs look nested.

We also recovered `menutitle` from legacy content. A small but important set of localized pages uses a shorter navigation label than the main page title.

## Decision
For the Next.js App Router v1:

- use flat locale-prefixed routes based on localized `slug`
- treat `parentPage` as navigation and breadcrumb data only, not as a URL nesting rule
- keep structural fields localized until the source-alignment manifest is reviewed
- add localized `menuTitle` to `Page`
- derive `navLabel = menuTitle ?? title` in the DTO layer

## Alternatives Considered
- Build nested URLs from localized parent chains.
  Rejected because the source data is flat and the current localized parent drift would create unstable route behavior.
- Ignore legacy `menutitle` and always render `title` in navigation.
  Rejected because it loses meaningful editorial intent on the pages where the menu label was deliberately shorter.

## Consequences
- Positive: route resolution stays simple and matches the legacy source contract.
- Positive: navigation can remain localized without blocking the frontend on cross-locale IA cleanup.
- Positive: editors retain separate control over page titles and menu labels.
- Negative: URL depth no longer mirrors the visual hierarchy.
- Negative: localized IA drift remains an explicit editorial review queue.

## Trade-offs
This keeps Next.js routing predictable and faithful to the current content while avoiding a premature attempt to normalize localized information architecture.
