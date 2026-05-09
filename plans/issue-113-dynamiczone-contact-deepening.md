# Plan: Issue 113 DynamicZone and Contact Deepening

> Source PRD: GitHub issue #113, "PRD: Deepen DynamicZone Section and Contact Rendering Modules"

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: Keep the current flat locale-prefixed Next.js routes. This plan does not add or move pages.
- **Schema**: Keep Strapi `Page.pageSections` as the single DynamicZone section container. No new Strapi fields.
- **Key models**: Preserve `PageDTO`, `SectionDTO`, `ContactClinicDTO`, `ContactDetailDTO`, `GlobalSettingsDTO`, and the shared `SectionComponent` union.
- **DTO seam**: Raw Strapi section payloads stay behind semantic normalization. Render modules consume semantic DTOs only.
- **Section ownership**: Supported DynamicZone capabilities are described through one section definition interface, with unknown sections preserved as semantic fallback content.
- **Contact ownership**: Contact clinic cards, primary contact actions, map query selection, map visibility, and stable iframe input are owned by a Contact rendering model.
- **Maps**: Follow ADR-009: coordinates first, address fallback second, no map when no usable query exists. No custom map SDK or provider abstraction.
- **Styling**: Preserve current visual layouts and ADR-007 styling boundaries. This is not a redesign.
- **Issue publishing**: Child slices are local only per user instruction; no child GitHub issues are created.

---

## Phase 1: Section Definition Coverage

**User stories**: 1, 4, 5, 18, 19, 20, 24, 25, 29, 30

### What to build

Create a small section definition interface that records supported DynamicZone components, default grid behavior, structured-data affordances, and home/default adapter intent. Existing normalization, grid, and schema lookup code should read from that interface where practical.

### Acceptance criteria

- [ ] Every supported DynamicZone component in the shared type contract has one section definition.
- [ ] Section normalization uses the section definition interface to distinguish supported from unsupported sections.
- [ ] Grid defaults and structured-data mappings are derived from section definitions.
- [ ] Unknown sections remain preserved through the semantic fallback path.
- [ ] A coverage test fails if a supported section is missing definition, grid, schema, or render coverage.

---

## Phase 2: Contact Rendering Model

**User stories**: 2, 6-14, 16, 17, 23, 28

### What to build

Introduce a Contact rendering model that converts the semantic Contact section into clinic cards, primary phone/email actions, active clinic defaults, stable map query metadata, and no-map fallback state. Contact pages keep their current layout but consume the model instead of deriving these rules inline.

### Acceptance criteria

- [ ] Contact clinic data is transformed into a semantic render model before layout rendering.
- [ ] Primary phone and email actions are deterministic.
- [ ] Phone and email href formatting is deterministic.
- [ ] Map query selection follows ADR-009: coordinates first, address fallback second.
- [ ] Map visibility is true only when a usable query exists.
- [ ] Clinic selection updates local UI state without changing stable map source.
- [ ] Contact page tests cover map with coordinates, map with address fallback, no-map fallback, contact action links, and active clinic behavior.

---

## Phase 3: Structured Data Alignment

**User stories**: 15, 20, 29

### What to build

Align structured-data section schemas with the section definition interface and the Contact model so JSON-LD reflects rendered Contact support without duplicating section knowledge in unrelated modules.

### Acceptance criteria

- [ ] Contact sections continue to emit `ContactPoint` and `MedicalBusiness` schema affordances.
- [ ] Section schema lookups read from the section definition interface.
- [ ] Structured-data tests prove schema output remains aligned with rendered section support.

---

## Phase 4: Final Gate and Closure

**User stories**: 3, 21, 22, 26, 27, 30

### What to build

Run focused and broad verification gates, document non-blocking warnings, and close #113 only if the refactor preserves current layouts and passes the required checks.

### Acceptance criteria

- [ ] Focused section, Contact, structured-data, and rendering tests pass.
- [ ] Frontend typecheck passes.
- [ ] Frontend unit tests pass.
- [ ] Frontend lint passes without new errors.
- [ ] Frontend production build passes.
- [ ] #113 receives a closure comment with command evidence.
