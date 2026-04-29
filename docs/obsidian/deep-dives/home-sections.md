---
module: Home sections
source: code reading (frontend/src/components/home/)
---

# Deep dive: Home sections

> Eight specialized homepage section components that render below the hero on the homepage. Each maps to a Strapi section type in the CMS.

## Architecture

```
HomePage (layout)
  └─ SectionRenderer (isHome: true)
      └─ renderSectionBodyHome (dispatcher)
          ├─ HomeHero (hero banner + CTA)
          ├─ HomeAdvantagesSection (icon-grid of advantages)
          ├─ HomeMedicalLedger (medical services ledger)
          ├─ HomeMedicalGrid (medical services grid)
          ├─ HomePromoGrid (promotional card grid)
          ├─ HomePromoCarousel (swipeable promo carousel)
          ├─ HomeVideoTheater (embedded video section)
          └─ HomeContactFooter (contact info footer)
```

## Component inventory

| Component | File | Purpose |
| --- | --- | --- |
| `HomeHero` | `components/home/HomeHero.tsx` | Full-width hero with background image, title, subtitle, CTA button |
| `HomeAdvantagesSection` | `components/home/HomeAdvantagesSection.tsx` | Icon + text grid showcasing service advantages |
| `HomeMedicalLedger` | `components/home/HomeMedicalLedger.tsx` | Accordion-style medical service ledger |
| `HomeMedicalGrid` | `components/home/HomeMedicalGrid.tsx` | Card grid of medical services with image + title + link |
| `HomePromoGrid` | `components/home/HomePromoGrid.tsx` | Promotional card grid with image + title + link |
| `HomePromoCarousel` | `components/home/HomePromoCarousel.tsx` | Swipeable carousel with left/right controls, slide transition, keyboard nav |
| `HomeVideoTheater` | `components/home/HomeVideoTheater.tsx` | Embedded YouTube video with responsive sizing |
| `HomeContactFooter` | `components/home/HomeContactFooter.tsx` | Contact info footer: phone, address, map link |

## Shared styles

`components/home/style-classes.ts` exports shared Tailwind classes for consistent spacing, typography, and background patterns across all home sections.

## Data flow

All home sections receive typed DTOs from `toSectionDTO()` in `page-normalizer.ts`. The section type is determined by the Strapi section component name (e.g., `sections.hero`, `sections.promo-slider`) and dispatched by `SectionRenderer`.

## Key dependencies

- `SectionRenderer` / `renderSectionBodyHome` — dispatcher
- `ButtonLink`, `SectionHeading`, `MediaFrame` — from [[../modules/components|design system]]
- `PageSection` — layout wrapper with background/rhythm classes
- `CmsHtml` — rich text rendering (used by hero, advantages, promos)

## Related

- [[../modules/sections]] — SectionRenderer module
- [[../modules/components]] — design system primitives
- [[../processes/page-rendering]] — page rendering flow
- [[../modules/i18n]] — homepage layout + copy
