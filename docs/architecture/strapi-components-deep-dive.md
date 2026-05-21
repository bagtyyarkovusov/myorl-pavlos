# Deep dive: Strapi component schemas

> 22 reusable Strapi components organized into `items/` (repeatable items), `sections/` (page sections), and `shared/` (cross-cutting).

## Items (11)

Repeatable items used inside sections and dynamic zones:

| Component | File | Purpose |
| --- | --- | --- |
| `items.accordion-item` | `items/accordion-item.json` | Single accordion entry: title + rich text body |
| `items.advantage` | `items/advantage.json` | Advantage card: icon, title, description |
| `items.clinic` | `items/clinic.json` | Clinic location: address, phone, map link |
| `items.contact-detail` | `items/contact-detail.json` | Contact detail: label + value + icon |
| `items.faq-item` | `items/faq-item.json` | FAQ entry: question + rich text answer |
| `items.gallery-item` | `items/gallery-item.json` | Gallery item: image + caption |
| `items.linked-resource` | `items/linked-resource.json` | Linked resource: title, description, URL |
| `items.promo-slide` | `items/promo-slide.json` | Carousel slide: image, title, subtitle, link |
| `items.social-link` | `items/social-link.json` | Social media link: platform + URL |
| `items.tab-item` | `items/tab-item.json` | Tab item: label + content blocks |
| `items.video` | `items/video.json` | Uploaded MP4/WebM media for inline page sections |

## Sections (10)

Top-level sections placed in the page dynamic zone:

| Component | File | Purpose |
| --- | --- | --- |
| `sections.accordion` | `sections/accordion.json` | Expandable accordion section (repeats `accordion-item`) |
| `sections.advantages` | `sections/advantages.json` | Icon-grid advantages section (repeats `advantage`) |
| `sections.contact` | `sections/contact.json` | Contact section: clinics + contact details |
| `sections.faq` | `sections/faq.json` | FAQ section (repeats `faq-item`) |
| `sections.gallery` | `sections/gallery.json` | Image gallery (repeats `gallery-item`) |
| `sections.linked-resources` | `sections/linked-resources.json` | Linked resources section |
| `sections.promo-slider` | `sections/promo-slider.json` | Promo carousel (repeats `promo-slide`) |
| `sections.social-links` | `sections/social-links.json` | Social media links (repeats `social-link`) |
| `sections.tabs` | `sections/tabs.json` | Tabbed content (repeats `tab-item`) |
| `sections.video` | `sections/video.json` | Embedded video section (uploaded media) |

## Video library

| Content type | File | Purpose |
| --- | --- | --- |
| `video-entry` | `api/video-entry/` | Standalone **Video Entry** catalog for `/el/video` and `/ru/video` directories (YouTube + optional related article) |

## Shared (1)

| Component | File | Purpose |
| --- | --- | --- |
| `shared.seo` | `shared/seo.json` | SEO metadata: meta title, description, OG image, canonical URL |

The `shared.seo` component is reused across `page` and `global` content types for consistent SEO field shapes.

## Frontend mapping

Section components are mapped to React components in `frontend/src/components/sections/SectionRenderer.tsx`. The mapping key is the Strapi component UID (e.g., `sections.accordion` → React `AccordionSection`).

Item components are normalized via the DTO layer in `frontend/src/lib/cms/page-normalizer.ts` — each item has a corresponding `to*Item()` function (e.g., `toAccordionItem`, `toPromoSlideItem`).

## Related

- [backend-api-deep-dive.md](backend-api-deep-dive.md) — Strapi API architecture
- [cms-module.md](cms-module.md) — frontend DTO layer
- [sections-module.md](sections-module.md) — SectionRenderer dispatcher
