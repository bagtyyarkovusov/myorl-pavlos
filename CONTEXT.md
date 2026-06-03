# Domain Glossary

This document defines the canonical vocabulary for architecture discussions in the myorl-pavlos project. Use these terms exactly — do not drift into synonyms.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| CMS | Strapi | 5.42.1 |
| Frontend | Next.js | 16.2+ (App Router, Turbopack) |
| Database | PostgreSQL | 18 |
| Container | Docker Compose | v3 |
| Languages | TypeScript, Python 3.11+ |
| Testing | Vitest, Playwright |
| CSS | Tailwind CSS v4, CSS Modules |

## Content Library

**Video Entry**:
A standalone medical video managed as a CMS catalog item, optionally connected to a related article for deeper reading.
_Avoid_: video block, embed, media file

**Related Article**:
The article a **Video Entry** points readers to when the video has a deeper explanation or procedure page.
_Avoid_: button link, corresponding page, more link

**Video Directory**:
A localized library page that lets readers browse and play **Video Entries**.
_Avoid_: video page, YouTube page, video block list

**Video Category**:
A local browsing label for grouping **Video Entries** within a **Video Directory**.
_Avoid_: site tag, article taxonomy, global category

**Accordion Page**:
A medical article whose body is a collapsible question-and-answer list rendered from a `sections.accordion` block in `pageSections`.
_Avoid_: FAQ page (when items use accordion item shape), tab page, flat article

**FAQ Page**:
A services or information page whose structured Q&A list lives in `sections.faq` within `pageSections`, often alongside prose in `page.content`.
_Avoid_: accordion page (when items use title/content accordion shape), flat article without disclosures

**Related Topics**:
Contextual cross-links shown alongside an article to help readers continue within the same medical subject — not a site-wide “popular articles” promo block.
_Avoid_: popular articles, global carousel, recommended posts
_See_: [ADR-010](../docs/adr/ADR-010-related-topics-replace-popular-articles.md)

**Related Pages**:
The editor-managed `relatedPages` relation on a **Page** that defines its **Related Topics** when manual curation is needed.
_Avoid_: linked-resources section (for article cross-links), popular articles list

**Appointment Page**:
The locale-specific booking destination (`/el/rantevou`, `/ru/zapis`) rendered with `layoutVariant: appointment-form`. Patients submit a lightweight booking request with minimal contact details plus preferred date and **Appointment Slot**; phone and clinic hours are offered as a fast path. Distinct from the **Contact Page**, which handles general inquiries, clinic cards, and maps.
_Avoid_: contact page (when the intent is booking), booking widget, scheduler embed

**Appointment Slot**:
A selectable 30-minute appointment time in the current date → hour → minute picker flow; available slots follow the client requirement: Monday and Friday `09:00-14:00`, Tuesday and Thursday `14:00-20:00`, with other days disabled unless a later client correction changes the clinic policy. A selected slot is a requested time, not a confirmed booking, until clinic staff confirm it.
_Avoid_: calendar reservation, confirmed appointment, free-text time preference

**Contact Page**:
The general reach-us page (`pageType: contact`) with clinic details, map, and message form for non-booking inquiries.
_Avoid_: appointment page (when the intent is booking)

**Clinic Index**:
The locale-specific hospital/clinic directory at `/el/klinikes` and `/ru/klinikes`. It lists cooperating clinics and should send patients to internal **Clinic Gallery Pages** first, not directly away to external hospital websites.
_Avoid_: external hospital link list, contact page clinic list

**Clinic Gallery Page**:
A clinic detail page under the **Clinic Index** (`layoutVariant: clinic-gallery`) that preserves the legacy MODX clinic content and photo gallery. The gallery photos come from the legacy `migxGallery` set and are represented in Strapi as a `sections.gallery` block.
_Avoid_: generic gallery page, official hospital website

**Office Page**:
The practice-office page (`/el/iatreio`, `/ru/iatreio`) that presents doctor identity, specialization, office address/contact actions, map access, and office imagery in the modernized structure of the legacy page.
_Avoid_: generic standard page, clinic index

**Biography Page**:
The doctor biography page (`/el/viografiko`, `/ru/viografiko`) that preserves the legacy CV/profile content and table-like structure while presenting it in a compact, readable, modernized layout.
_Avoid_: generic service article, oversized journal article, marketing bio page

**Typography Token System**:
The sitewide type scale, font-role tokens, line-height rules, prose widths, table text rules, and responsive text behavior used across public pages. It is a design-system surface, not a one-off CSS pass.
_Avoid_: ad hoc font-size fixes, page-specific clamp tuning, browser-font-size-fragile typography

**Official Clinic Website**:
The external website URL for a cooperating clinic or hospital. It is supporting reference information on a **Clinic Gallery Page**, not the primary destination for **Clinic Index** cards.
_Avoid_: clinic page URL, gallery link, internal clinic page

**Human Site Map**:
The locale-specific HTML topic directory at `/el/sitemap` and `/ru/sitemap` — a nested link tree for patients browsing all main sections and articles. Frontend-native (`layoutVariant: sitemap`); rendered from the locale page tree (`directoryNavigation`), not CMS body content. Excludes system layouts (`not-found`, `search-results`, `sitemap`, `appointment-form`). Fully expanded nested lists (legacy parity), not collapsible sections.
_Avoid_: XML sitemap, footer nav, search results

**Home Hero Section**:
The editor-managed lead section on the locale **Canonical Home**, containing the patient-facing opening message, primary call to action, and hero media.
_Avoid_: homepage single type, hard-coded hero copy, page title as hero content

**Home Quick Access Cards**:
The six icon navigation cards on the **Canonical Home** that summarize key site areas from their Strapi page title/nav label and excerpt.
_Avoid_: promo slider, hard-coded card descriptions, duplicate home-only summaries

**Home Testimonials Teaser**:
The patient-review preview on the **Canonical Home**, with editor-owned heading/intro and externally sourced review content.
_Avoid_: hard-coded testimonials headline, review content section, manual review cards

**Home Notice Section**:
A short editor-owned homepage notice used for legacy clinic positioning or patient guidance that should stand apart from the hero, cards, and testimonials.
_Avoid_: alert component, generic rich-text filler, hidden hard-coded homepage paragraph

**Section Sub-page**:
A published page with a valid `parentPage` that stays `hideFromMenu: true` — reachable via its section hub (tab bar, section index, office page) but omitted from the header mega-menu. Examples: office galleries under **Ιατρείο**, septum articles under the septum hub.
_Avoid_: orphan page, menu-root item

**Navigation Audit**:
A one-time CMS cleanup pass on mis-parented or wrongly hidden pages before the **Human Site Map** ships. Unhide menu-root discoverables, reparent true orphans, delete migration artifacts; leave **Section Sub-pages** hidden.
_Avoid_: sitemap workaround, frontend-only link injection

**XML Sitemap**:
The machine-readable crawler feed at `/sitemap.xml`, generated by Next.js from pages where `seo.sitemapExclude` is false. Distinct from the **Human Site Map**.
_Avoid_: HTML sitemap page, `/el/sitemap` route

**Global Settings**:
The Strapi `global` single type: localized sitewide chrome edited per locale (`el`, `ru`) for **Primary Contact** fields, plus shared non-localized social links. Consumed by header, footer, appointment page, and home visit map.
_Avoid_: global navigation (the page menu tree), contact page content, server env secrets

**Social Links**:
Repeatable `items.social-link` rows on **Global Settings**, stored once (non-localized). The same accounts render on every locale; social presence is not locale-specific. Canonical shared set: Facebook (`orlathens`), YouTube (`OrlAthens`), Instagram (`myorl.gr`), Google Maps listing. Exclude legacy Google Plus and Russian-only `orl1.gr` Facebook mirror.
_Avoid_: homepage `sections.social-links`, per-locale social lists

**Primary Contact**:
Sitewide chrome fields in **Global Settings**: localized address, hours, public email, and two callback phone pairs (landline + mobile). Distinct from per-clinic details on the **Contact Page** (`sections.contact` / `items.clinic`). Canonical numbers from legacy [myorl.gr](https://myorl.gr/): landline `211-01 94 618` (`+302110194618`), mobile `6945 77 30 77` (`+306945773077`). Public email: `pavlos.tsolaridis@gmail.com`. Do not use redesign placeholder `+30 210 6427 000`.
_Avoid_: contact page fallback clinics, Resend delivery config

**Footer Tagline**:
The localized sitewide practice description shown beside the footer brand mark.
_Avoid_: footer translation string, home tagline, copyright text

**Contact Form Delivery**:
Server-side email routing for `/api/contact` submissions via Resend (`CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `RESEND_API_KEY`). Independent of the public **Primary Contact** display email; uses a test Resend sender until production mail is configured.
_Avoid_: primary contact email, Global Settings

## Frontend Experience

**Loading Chrome**:
Brief non-content UI shown while navigation or async work completes (skeleton bars, dimmed result lists, scroll-triggered section fade-in). myORL policy: CMS **Pages** ship real HTML on first paint via ISR; no route-level skeletons or section entrance animation. Loading feedback is limited to client search (header overlay stale-while-revalidate) and truly dynamic routes (`search-results`). Empty media slots use **Stripe Placeholder**, not loading chrome.
_Avoid_: skeleton, shimmer, placeholder page, loading.tsx on CMS routes

**Legacy Site Baseline**:
The previous public myorl.gr site used to classify client-reported differences in content, URLs, contact facts, doctor identity, and appointment workflow, but not as a pixel-perfect visual design specification.
_Avoid_: old design spec, MODX clone, pixel parity

**Patient-facing Copy**:
Visible clinic, doctor, medical, service, and appointment text that a non-technical editor expects to maintain in Strapi.
_Avoid_: hard-coded content, frontend translation (when the text is clinic/medical content)

**UI Chrome Copy**:
Small interface labels, controls, affordances, and system messages that belong to the frontend translation files rather than Strapi editorial content.
_Avoid_: article content, clinic facts, service descriptions

## Search

**Search Index**:
A Meilisearch index containing all searchable content for a single locale. Two exist — `el` and `ru` — each with locale-appropriate tokenizer and stemmer. Combines **Pages** and **Video Entries** as **Search Documents** distinguished by a `type` facet. The canonical truth source is Strapi; the index is a derived projection rebuilt by [`tools/seed_search_index.py`](tools/seed_search_index.py) and incrementally updated via Strapi webhooks into [`/api/search/reindex`](frontend/src/app/api/search/reindex/route.ts). See [ADR-011](docs/adr/ADR-011-full-site-search-via-meilisearch.md).
_Avoid_: search database, full-text index (when referring to Postgres FTS), Algolia index

**Search Document**:
A single indexed record in a **Search Index**, representing one Page or one Video Entry in one locale. Carries searchable fields (`title`, `excerpt`, `body`), display fields (`href`, `thumbnail`, `parentTitle`), facet fields (`type`, `parentSection`, `tags`, `layoutVariant`), and cross-locale fields (`localizations`) for the locale-fallback redirect path. Composite ID format `page:{id}` or `video:{id}`.
_Avoid_: search row, search entry, Meili record (use when speaking specifically about the storage layer)

**Search Synonym Dictionary**:
The repo-versioned YAML files (`frontend/src/lib/search/synonyms.el.yaml`, `synonyms.ru.yaml`) defining colloquial / cross-locale / clinical-term equivalences pushed to Meilisearch via the `sync-synonyms` subcommand of the seed tool. Owned by dev in v1 — editor requests an addition, dev commits a PR. Migrate to Strapi-managed only if the dictionary outgrows YAML.
_Avoid_: Meili synonyms config (when referring to the canonical source), search aliases

**Search Query Log**:
The anonymous Postgres table `search_query_log` capturing `{ query, locale, result_count, session_id, created_at }` for every search submitted. No IP, no user account, no persistent identifier. Session UUID is generated per browsing session in `sessionStorage`. 90-day TTL enforced by scheduled SQL job. Powers the internal `/admin/search-analytics` view; the input to the editor's synonym + content backlog. GDPR-defensible under the anonymous-data carve-out and documented in the user-facing privacy notice.
_Avoid_: search analytics database, search telemetry, query tracking

## SEO

**URL Mapping**:
The Strapi content type holding legacy → canonical URL pairs that drive every per-page `301` and `410` after the MODX cutover. Editor-owned post-seed. Seeded once from the **Legacy URL Inventory** (slug-changed and retired rows) and the 31 `Redirect 301` lines in the legacy MODX `.htaccess` (lives outside this repo at `~/Projects/public_html/.htaccess`). Replaces the dev-only [`data/manifests/slug_redirects_next.json`](data/manifests/slug_redirects_next.json), which collapses into a one-time seed input rather than a runtime source. See [gh-issue-13 plan](../myorl-migrate/plans/gh-issue-13-seo-redirects-schema.md).
_Avoid_: slug redirects manifest (post-cutover), htaccess rules, hand-written `next.config.ts` redirects (these collapse into URL Mapping entries)

**Legacy URL Inventory**:
The 367-row CSV exporting every published MODX `modx_site_content` resource with locale, URI, alias, parent, publish/delete/hidemenu flags, and a `status_guess` triage column (`candidate`, `review`). Lives outside this repo at `~/Projects/myorl-migrate/old_url_inventory_clean.csv`. Primary seed input for [[URL Mapping]] and the source of truth for "did this URL exist in the legacy site?" questions.
_Avoid_: redirect manifest (the inventory is broader — many rows are slug-unchanged and do not become URL Mapping entries)

**Canonical Home**:
The locale-specific home page at `/el` (and `/ru`). The bare apex `https://myorl.gr/` does **not** render a page — it returns a permanent (`308`) redirect to `/el`. There is no apex landing page, no language picker, no Accept-Language–driven home; the EL home is the brand-default landing. Every Strapi page lives at `/<locale>/<slug>` without exception — the home is just the page whose slug is `index`, which `hrefForLocaleSlug` collapses to `/<locale>`. Canonical tag on the EL home is `https://myorl.gr/el`; the sitemap lists `https://myorl.gr/el`, never `https://myorl.gr`.
_Avoid_: apex home, root home, language picker, bare-domain canonical

## Relationships

- A **Video Entry** may point to zero or one **Related Article**.
- Localized **Video Entries** may represent the same underlying video while preserving per-locale title, tags, visibility, and **Related Article**.
- A **Related Article** must be an internal page relation before the Video Directory shows a reader-facing link; `legacyArticleUrl` is migration evidence only and is not converted into runtime URLs.
- A **Video Directory** plays **Video Entries** inline and remains the first restoration target before article-page embeds.
- A **Video Category** belongs to the video library and should not be treated as the site-wide article taxonomy.
- The first **Video Directory** restoration should migrate the historical video set, with unresolved **Related Articles** treated as cleanup work rather than migration blockers.
- **Related Topics** replace the legacy MODX global “popular articles” pattern: links must be contextual to the page the reader is on, not identical sitewide discovery.
- **Related Topics** are distinct from a **Related Article** on a **Video Entry** (one video → one deeper page) and from home-only editorial promo blocks.
- **Related Topics** use a hybrid curation model: auto-suggest from shared tags and parent section, with editors overriding via **Related Pages** when needed.
- **Related Topics** render in the article sidebar on desktop and in a mobile-friendly panel when the sidebar is hidden — not as a sitewide bottom carousel.
- **Related Topics** appear on long-form medical article layouts: `encyclopedia-article`, `specialized-article`, and `service-article` — not on FAQ, accordion, contact, or directory index pages.
- Reader-facing publication/update/review dates are not shown on pages, though invisible structured-data dates may remain when useful for search engines. Article **Sources** remain editor-managed and should be preserved or restored from the **Legacy Site Baseline** when they improve medical content quality, trust, or SEO.
- Missing localized **Sources** may be backfilled from the paired locale article when both pages cover the same medical topic and the target locale has no source list of its own.
- When **Related Pages** is empty, **Related Topics** auto-suggest from shared tags first, then fill remaining slots from sibling pages under the same parent section, up to six links. Editor-curated **Related Pages** replace auto-suggest entirely when present.
- On article pages, **`sections.linked-resources`** is retired after a one-time migration into **Related Pages**; the section remains for home editorial grids only.
- Auto-suggested **Related Topics** exclude the current page, parent hub/index pages, menu-hidden pages, and non-article layout variants — only other long-form medical articles qualify.
- When no **Related Topics** resolve, hide the panel entirely — do not render an empty heading on desktop or mobile.
- Encyclopedia-style prose stored entirely in **`page.content`** with **`service-article`** layout and **empty** **`pageSections`** is an editorial mismatch when the cinematic service shell is unwanted: **`encyclopedia-article`** is the canonical long-form article layout — HTML normalization and optional layout normalization run through [`tools/repair_service_article_blob_pages.py`](tools/repair_service_article_blob_pages.py) (dry-run by default).
- **Human Site Map** and **XML Sitemap** serve different audiences: patients browse the HTML tree; search engines consume `/sitemap.xml`. They must not be conflated on the human page.
- The **Human Site Map** uses `directoryNavigation` (includes **Section Sub-pages** nested under their parent) and excludes system layouts. Header nav (`navigation`) remains menu-visible pages only.
- **Legal/System Pages** such as privacy policy are text-first utility pages and should not inherit random medical hero/gallery imagery. They render without decorative medical images unless an editor explicitly attaches page-specific legal imagery.
- **Section Index** pages use curated topic tags as a modernized replacement for legacy category browsing. Keep the visible tag set intentionally small and useful, roughly 5-10 patient-facing topics per index over time, rather than exposing every backend tag in the UI.
- **Section Index** and article media must match the **Legacy Site Baseline** on production `myorl.gr` when the legacy page has a clear media precedent. Media that does not match the legacy page is removed automatically from the new CMS/page surface unless a later client correction explicitly approves it. Frontend layouts should also cap image dimensions so a bad media choice cannot dominate the page.
- The **Typography Token System** should be redesigned around fixed `rem`-based role tokens, not scattered component font sizes or viewport-driven `clamp()` text. It should make article pages and dense content pages more compact than the current oversized treatment while preserving minimum readable body text, comfortable `65-75ch` prose line lengths, and bilingual Greek/Russian stability.
- The **Typography Token System** must include article prose, headings, labels, navigation, cards, tables, CMS HTML, and responsive behavior. Acceptance checks should verify that Chrome/default browser font-size differences, zoom to 200%, and long Russian/Greek strings do not break key layouts.
- `Roboto Condensed` remains the canonical public UI typeface. The typography redesign changes scale, weights, row/table rhythm, line-height, prose width, and responsive rules around that family rather than introducing a new font pairing.
- A **Home Hero Section** belongs to the locale `index` **Page** as structured section content; seed it from existing home page title/excerpt/media when migrating, but do not use `page.title` or `page.excerpt` as the long-term hero content source.
- **Home Hero Section** and other home editorial backfills should prefer the **Legacy Site Baseline** / MODX source data as the seed source; current Strapi page title/excerpt/media and frontend copy are fallbacks only when the legacy source has no suitable value.
- For the **Canonical Home**, the **Legacy Site Baseline** is the content specification, not a visual layout specification: preserve legacy homepage messages, item choices, and editorial facts while fitting them into the new homepage design system.
- Legacy home `pagetitle` values such as `Menu` / `Меню` are navigation labels, not patient-facing hero headings. Legacy SEO-style `longtitle` / `metaTitle` may seed SEO fields or be shortened into patient-readable **Home Hero Section** copy rather than rendered verbatim.
- Homepage backfill should scrape live legacy `myorl.gr` when available and prefer visible legacy home copy for patient-facing fields. For RU, the live legacy identity string `Pavlos Tsolaridis, M.D. - ЛОР-врач` is a valid hero/kicker candidate, while the full `<title>` remains SEO metadata.
- When homepage seed sources conflict, precedence is: explicit current client corrections first, **Legacy Site Baseline** second, current Strapi content third, and current hard-coded frontend copy last.
- Homepage editorial backfill is delivered through a scripted dry-run/apply workflow with an auditable plan, not through one-off manual Strapi edits.
- Homepage backfill must be plan-driven: fill missing safe fields by default, report non-empty Strapi-vs-legacy conflicts, and overwrite existing Strapi content only when explicitly approved.
- **Home Quick Access Cards** derive their title and description from the target Strapi page's navigation label/title and excerpt; missing excerpts should remain visibly missing rather than being replaced by frontend fallback marketing copy.
- **Home Resource Groups** are editor-managed homepage groups for legacy operation/service lists, with each group owning its heading, optional intro, item list, and view-all target. They replace flat home-only `sections.linked-resources` when the legacy baseline distinguishes groups such as **Επεμβάσεις / ЛОР Операции** and **Υπηρεσίες / Услуги**.
- **Home Resource Groups** are assigned from live legacy homepage headings when available: items under **Επεμβάσεις / ЛОР Операции** become the operations group, and items under **Υπηρεσίες / Услуги** become the services group. MODX-only candidates not visible on live legacy are review items, not silent inserts.
- The **Home Testimonials Teaser** heading and intro are **Patient-facing Copy** seeded into Strapi; controls, rating labels, review-count templates, and expand/collapse labels remain **UI Chrome Copy**.
- Patient-facing headings and intros on the **Canonical Home** are **Patient-facing Copy**: seed and edit them in Strapi section fields, and do not replace missing values with hard-coded frontend marketing copy.
- **Page Sections** stay as one shared DynamicZone for all page types; layout-specific correctness is enforced by validation rules rather than separate per-layout section fields.
- Home `pageSections` allow-list: **Home Hero Section**, promo slider, advantages, linked resources during migration, **Home Resource Groups**, video, **Home Testimonials Teaser**, and **Home Notice Section**. Contact details, social links, FAQ, accordion, tabs, and gallery sections are not part of the current **Canonical Home** composition.
- **Navigation Audit** canonical fixes: `viografiko` — unhide at Menu hub; `plirofories-gia-asfalismenous-edoeap-kai-trapeza-tis-ellados` — reparent under `timokatalogos` and unhide; `botulinotherapia-ru` — unhide under `plastika-litsa`; `ru-page` — unpublish and delete. **Section Sub-pages** (office galleries, septum cluster) stay `hideFromMenu: true`.
- Sitewide **Записаться / Κλείσε ραντεβού** CTAs resolve to the locale **Appointment Page** via `findAppointmentHref()`; they do not route to the **Contact Page**.
- The **Appointment Page** sends booking requests through the contact workflow, but the patient-facing form is intentionally smaller than the general contact form and includes an **Appointment Slot** selector; clinic staff confirm bookings by callback.
- The **Clinic Index** links to internal **Clinic Gallery Pages** so patients can read the clinic details and open the migrated gallery before leaving the site. **Official Clinic Website** URLs may be shown as secondary links, but must not replace the internal gallery destination.
- **Clinic Gallery Pages** preserve legacy MODX `migxGallery` photos as editor-managed Strapi `sections.gallery` items for both locales where the clinic page exists.
- **Clinic Index**, **Clinic Gallery Pages**, and the **Office Page** are parity-sensitive visual/content surfaces: they should use modernized legacy structure for image sizing, address/contact placement, gallery density, and map access rather than generic article/page layouts.
- The **Biography Page** is a parity-sensitive readability surface: preserve the legacy biography/CV structure, but redesign its table and typography so the content is scannable, compact, and readable on desktop and mobile.
- **Global Settings** owns sitewide chrome only; multi-clinic addresses, transit directions, and coordinates stay on the **Contact Page** via `sections.contact`, not in Global.
- **Primary Contact** in **Global Settings** feeds header, footer, appointment page, and home visit map; it does not replace per-clinic rows on the **Contact Page**.
- **Primary Contact** stores two phone pairs (landline + mobile) matching legacy [myorl.gr](https://myorl.gr/); `+30 210 6427 000` is not canonical.
- **Doctor Identity** in **Global Settings** feeds the header brand area; desktop presentation should keep the doctor name on one line and keep the primary navigation visually separate beneath/beside it without wrapping into an unreadable stack.
- Localized **Primary Contact** `hours` renders in the footer, home visit map, appointment page, and other contact surfaces that need hours; it does not render in the desktop utility bar unless that chrome is explicitly reintroduced. Editors manage one `hours` string per locale in **Global Settings**. Seed format: two lines (weekdays + Saturday), e.g. Greek `Δευ–Παρ · 09:00 – 21:00` / `Σάβ · 10:00 – 14:00`.
- The **Footer Tagline** is localized **Patient-facing Copy** in **Global Settings**; it is edited once per locale and reused by the sitewide footer.
- Home visit/map labels such as address, hours, direct contact, and show-map are **UI Chrome Copy**; the underlying address, hours, phones, email, and map destination are **Primary Contact** data in **Global Settings**.
- Public map surfaces use a dimmed, user-activated map facade before any Google map interaction. Activating the facade opens Google Maps externally for the address instead of loading an embedded iframe in place, unless a future requirement explicitly needs an in-page map.
- Public **Primary Contact** email (`pavlos.tsolaridis@gmail.com`) is editor-managed in **Global Settings**; **Contact Form Delivery** stays in server env and is not changed until production Resend is configured for the clinic mailbox.
- **Social Links** on **Global Settings** are non-localized; the same list renders on Greek and Russian pages. Canonical set: Facebook `orlathens`, YouTube, Instagram, Google Maps; no Google Plus or `orl1.gr`. Footer and header read Global only; homepage `sections.social-links` is not used for chrome.
- The legacy `sections.social-links` page section is not a valid editorial surface after **Social Links** moved to **Global Settings**; audit existing page data, migrate/discard duplicates, then remove it from the shared **Page Sections** DynamicZone.
- Hard-coded **Primary Contact** fallbacks in frontend code remain until **Global Settings** is populated and verified in staging; then they are removed so Strapi is the sole source of truth.
- Hard-coded **Contact Page** fallbacks (`contact-section-fallbacks.ts`) follow the same phased removal: keep until contact pages are verified from CMS, then delete.
- **Global Settings** canonical Primary Contact and **Social Links** are seeded idempotently via `backend/src/bootstrap/seed-global.ts` (version marker); editors override in Strapi afterward.
- The **Search Index** is locale-scoped: visitors see results from their current locale first. When the current-locale query returns zero, a transparent fallback to the other locale fires with a banner; result links auto-swap to the visitor's locale when a `localizations` translation exists.
- A **Search Document** is derived from a Page or Video Entry via the existing CMS gateway transformation; indexing logic lives next to the gateway, never in Strapi backend code.
- Strapi lifecycle events for Pages and Video Entries trigger Strapi webhooks → `/api/search/reindex` → Meilisearch upsert/delete. Bulk `pg_restore` operations bypass webhooks; `tools/orchestrate_migration.py` therefore chains restore + reindex + smoke-test into a single command.
- The browser talks directly to Meilisearch for the instant dropdown (scoped search-only key, low latency); the dedicated `/search-results` page is SSR'd via Next.js with the master key server-side. The master key never appears in the browser bundle — enforced by `import "server-only"` in the admin client module.
- The **Search Synonym Dictionary** is part of the **Search Index** lifecycle: synonyms + stop words push as part of every full reindex via `tools/seed_search_index.py sync-synonyms`.
- The **Search Query Log** stores no personally identifying data and is automatically pruned at 90 days; the privacy contract is encoded in code (table schema) and disclosed to users in the privacy notice.
- Section Sub-pages (`hideFromMenu: true`) are present in the **Search Index** even though they are hidden from the header mega-menu — they are real content reachable via section hubs. System layouts (`not-found`, `search-results`, `sitemap`, `appointment-form`) are excluded.
- Client-reported differences against the **Legacy Site Baseline** are treated as content/workflow parity issues when they involve missing pages, URLs, contact facts, doctor identity, appointment behavior, or editor visibility; visual differences are handled as design review items unless they break readability, accessibility, or responsiveness.
- For a **Client Requirements PRD**, the **Legacy Site Baseline** is the primary source of truth for content parity; local MODX exports, local Strapi snapshots, and live legacy scrape evidence are acceptable evidence sources for proving what the baseline contained.
- A **Client Requirements PRD** resolves client-reported parity gaps as content, CMS workflow, routing, and behavior requirements; it does not require legacy visual matching except where layout blocks readability, accessibility, or task completion.
- **Content Parity** includes page existence, URL availability, patient-facing text and media, navigation visibility, and CMS editability for patient-facing copy.
- The client-facing remediation PDF is written in Russian and explains outcomes in client-readable language rather than implementation jargon.
- **Patient-facing Copy** should be CMS-managed when Strapi already has an appropriate field or section shape; **UI Chrome Copy** can remain in frontend i18n files.

---

## Rehearsal Environment

A **disposable, isolated PostgreSQL database** used to validate query plans, data strictness, and migration correctness before production deployment. The rehearsal environment uses a fixed host port (`55532`) and a dedicated Docker container (`myorl-pg-rehearsal`) to prevent collisions with native PostgreSQL (`5432`) and dev Docker (`55432`).

The rehearsal environment is provisioned declaratively via `docker-compose.rehearsal.yml` and orchestrated by `tools/orchestrate_rehearsal.py`.

## Canonical Export Adapter

The **unified module** for migrating full Strapi state between databases. It supports two deployment paths:

1. **Shell-access path**: `strapi export` → `strapi import` via tarball
2. **Platform-managed path**: `pg_dump` → `pg_restore` via SQL

The adapter chooses the correct transport based on target capabilities. The interface is a single command; the implementation hides the complexity of export formats, connection strings, and schema compatibility checks.

## Port Guard

The **preflight validation module** that checks port availability, container conflicts, source database existence, and environment configuration before any database operation begins. The port guard fails fast with actionable errors, preventing the class of port-conflict data-loss failures. It reads target identity from the Environment Manifest.

## Environment Manifest

The **single source of truth for deployment-target identity** (host port, container name, volume name, database name, database user, compose file, access kind). Lives at `tools/environments.py`. Every Python tool that touches a target — Port Guard, Canonical Export Adapter, rehearsal orchestrator — imports `ENVIRONMENTS` from the manifest instead of carrying its own copy.

Secrets, runtime tunables (pool sizes, SSL flags), and constants that don't vary across environments (Strapi 1337, Next.js 3000) deliberately do not live in the manifest. They live in `.env.<target>` files or compose YAML.

Drift between the manifest and `docker-compose.<target>.yml` is caught by `tests/test_environments.py`.

## Deep Module

A module that **encapsulates a lot of functionality in a simple, testable interface** which rarely changes. The rehearsal orchestrator is a deep module: its interface is a single command, but its implementation manages Docker lifecycle, Strapi CLI invocation, psql execution, and error handling.

## Shallow Module

A module whose **interface is nearly as complex as its implementation**. The previous `backend/.env` with commented-out database lines was a shallow module: deleting it would scatter complexity across every developer's memory.

## Seam

A **place where behavior can be altered without editing in place**. The database client configuration in `backend/config/database.ts` is a seam: switching from SQLite to PostgreSQL requires only changing an environment variable, not editing TypeScript.

## Adapter

A **concrete thing satisfying an interface at a seam**. The Strapi `export`/`import` CLI commands are the shell-access adapter. The `pg_dump`/`pg_restore` pipeline is the platform-managed adapter. Both satisfy the same canonical export adapter interface.

## Forward-Only Migration

A **database migration that cannot be rolled back** by editing the migration file after it has run. Forward-only migrations are required for production PostgreSQL because shared databases must not have their migration history altered. Rollbacks are implemented as new forward-only migrations that reverse the previous change.

## Migration Runner

The **codified enforcement module** for the Forward-Only Migration policy. Lives at `tools/migration_runner.py`. It discovers migrations in `backend/database/postgres-migrations/`, tracks applied state in a `_migrations` table with SHA-256 checksums, and enforces:

- **Edited-migration guard** — fatal error if a previously-applied `.up.sql` file changes.
- **Prod safety** — `up` requires `--force` for production; `down` is blocked entirely for production.
- **Idempotent apply** — skips already-applied migrations; applies pending ones in filename order.

## SQLite Fallback Store

The **local SQLite database** (`backend/.tmp/data.db`) used for fast development without Docker (`npm run dev:local`). It is a convenience fallback, not a source of truth. The canonical `Strapi State` store for dev and rehearsal is **dev Postgres** (`myorl-pg`). See ADR-008.

## Strapi State

The **complete data owned by Strapi**, including:
- Content (pages, tags, components)
- Navigation items
- Media Library references
- Users and permissions
- Plugin configuration

A canonical migration must transfer the full Strapi state, not just pages and tags.

## Backup Runner

The **automated backup / restore / drill module** for PostgreSQL and uploads. Lives at `tools/backup_runner.py`. It wraps `pg_dump` and `psql` with three modes:

- **backup** — full/schema-only/data-only dump, gzip-compressed, with automatic retention pruning (30 days).
- **restore** — drop/recreate/import cycle. Blocked for production without ``--force``.
- **drill** — backup → restore → verify row counts. Blocked for production entirely; intended for rehearsal.

## Port Allocation Contract

The **fixed port mapping** that prevents collisions. PostgreSQL host ports are owned by the Environment Manifest (`tools/environments.py`) — this table mirrors that for human reference; the manifest is canonical:

| Port | Owner |
|------|-------|
| `3000` | Next.js frontend (dev hot reload via HMR) |
| `1337` | Strapi CMS backend (dev hot reload) |
| `5432` | Native/system PostgreSQL (`auto.tm` project) |
| `55432` | Dev Docker PostgreSQL (`myorl-pg`, `pgdata_dev` volume) |
| `55532` | Rehearsal Docker PostgreSQL (`myorl-pg-rehearsal`, `pgdata-rehearsal` volume) |
| _internal_ | Production Docker PostgreSQL (`myorl-pg-prod`, `pgdata-prod` volume) — no host exposure |
| `57700` | Dev Docker Meilisearch (`myorl-meili-dev`, `meilidata_dev` volume) |
| `57701` | Rehearsal Docker Meilisearch (`myorl-meili-rehearsal`, `meilidata_rehearsal` volume) |
| _internal_ | Production Railway Meilisearch service (no host exposure) |

This contract is enforced by the Port Guard module via the manifest.

## Dev Environment (Docker)

The **canonical dev stack** runs in Docker Compose with hot reload on all services:

| Service | Container | Image | Volume mount |
|---------|-----------|-------|-------------|
| PostgreSQL 18 | `myorl-pg` | `postgres:18` | `pgdata_dev` (persistent) |
| Strapi 5 | `myorl-strapi-dev` | `node:20-alpine` | `./backend:/app` (hot reload), `strapi_node_modules` (named) |
| Next.js 16 | `myorl-nextjs-dev` | `node:24-slim` | `./frontend:/app` (hot reload), `nextjs_node_modules` (named) |

**Key behaviors:**
- Code changes trigger auto-reload — no rebuild needed
- `node_modules` persist in named volumes across restarts
- `npm install` in running container (`docker exec myorl-strapi-dev npm install <pkg>`), or remove `node_modules/.package-lock.json` sentinel + restart
- Only rebuild with `--build` when `Dockerfile` changes (base image, system deps)
- Images served via Next.js `rewrites()` proxy: `/uploads/*` → Strapi (port 1337)
- Strapi connects to Next.js on `http://localhost:3000` for preview

**Commands:**
```bash
npm run dev          # Start full Docker dev stack
npm run dev:local    # Native host (Strapi + Next.js, needs Docker PostgreSQL)
npm run dev:db       # Start only PostgreSQL for local dev
npm run dev:down     # Stop Docker dev stack
```

## Search Stack (Meilisearch)

The **search projection layer** runs as a separate per-environment service alongside PostgreSQL. Indexes are derived from Strapi state and rebuilt via [`tools/seed_search_index.py`](tools/seed_search_index.py); incremental updates flow Strapi webhook → `/api/search/reindex` → Meilisearch.

| Environment | Container / service | Host port | Volume |
|-------------|---------------------|-----------|--------|
| Dev | `myorl-meili-dev` (Docker, `meilisearch:v1.x`) | `57700` | `meilidata_dev` |
| Rehearsal | `myorl-meili-rehearsal` (Docker, `meilisearch:v1.x`) | `57701` | `meilidata_rehearsal` |
| Production | Railway service `meilisearch` | _internal_ | Railway persistent volume |

**Keys:**
- `MEILI_MASTER_KEY` — server-only env var. Admin access for the seed tool and the Next.js `/api/search/reindex` endpoint. Never exposed to the browser.
- `NEXT_PUBLIC_MEILI_SEARCH_KEY` — public env var. Scoped to `actions: ["search"]`, `indexes: ["el", "ru"]`. Embedded in the browser bundle for the instant dropdown.

**Feature flag:** `SEARCH_ENABLED` (per environment). When `false`, the header search icon hides, `/search-results` renders a placeholder, and the webhook receiver is a no-op. Graceful degradation when Meilisearch is unreachable in dev/CI.
