# PRODUCT.md — myORL

> Bilingual (Greek / Russian) ENT clinic website. Design serves the product.

## Register

**Product** — This is a patient-facing medical services UI. Design clarity and accessibility are primary; visual flourish is secondary. The surface is not the brand campaign.

## Users

### Primary: Prospective Patients
- Greek and Russian-speaking adults, 30–60, researching ENT diagnosis or treatment for themselves or their children
- Often anxious, in discomfort, or overwhelmed by medical jargon elsewhere
- Emotional state on landing: uncertain but hopeful. They want to know: *"Can this doctor help me? Is he credible? How do I reach him?"*
- They are not browsing casually — they have a specific concern

### Secondary: Existing Patients
- Returning to book follow-ups, check clinic hours, or find contact information

### Tertiary: Referring Physicians
- Looking for specialist capabilities, procedures offered, or contact details
- Negligible traffic, high value when they do visit

## Product Purpose

Help patients:
1. Discover what ENT services and procedures the clinic offers
2. Understand the clinic's credentials and advantages
3. View testimonials and patient outcomes
4. Find contact information and location
5. Book appointments

## Brand Tone

**Calm authority.**

- Warmth + credibility in balance. The doctor's name and credentials are front-and-center because they justify the calm.
- Clarity is itself a credential. "Σαφής" (clear) is the first word of the hero — not a afterthought.
- Jargon is removed not because content is dumbed-down, but because respect for the patient is a mark of expertise.
- Personal, not corporate. "Προσωπική φροντίδα" (personal care), not "Πολυϊατρείο Α.Ε."
- Bilingual parity is non-negotiable — Greek and Russian experiences are equally complete; no locale is a second-class citizen

## Anti-References

What myORL is explicitly **not**:

- **Not WebMD / dense clinical encyclopedia** — We remove jargon; they add it. We guide; they dump.
- **Not generic SaaS-cream template** — We have condensed medical-office typography + custom hairline grids; templates are interchangeable sans-serif card farms.
- **Not hospital-corporate sterile** — We say "ήρεμη καθοδήγηση" (calm guidance); hospitals say "ΩΡΛ ΤΜΗΜΑ" (ENT DEPARTMENT).
- **Not Mediterranean-tourism playful** — No warm sunsets, no olive branches, no "experience Athens." This is medicine, not hospitality.
- **Not crypto/tech aggressive dark mode** — No neon, no glassmorphism as default, no gradient text. We are not trying to impress; we are trying to reassure.

## Strategic Principles

1. **Trust through clarity** — Information is structured and scannable, not hidden behind clicks or decoration. Overrides mystery-meat navigation, vague labels, and abstract icon-only buttons.
2. **Bilingual parity** — Greek and Russian experiences are equally complete. Overrides any design that assumes Greek text length and breaks in Russian (or vice versa).
3. **Restraint over decoration** — Medical professionalism is signaled through precision and consistency, not effects. Overrides "let's add a subtle gradient," "can we animate this entrance."
4. **Accessibility as baseline (WCAG 2.2 AA+)** — AA for all criteria, with enhanced focus indicators exceeding AA visibility. Stressed users with motor control issues need unambiguous focus states. Overrides "the focus ring looks ugly."
5. **Performance over entrance animation** — Largest Contentful Paint and immediate content visibility take priority over staggered reveals. The hero renders instantly; motion is reserved for secondary elements and progressive enhancement.
6. **Frontend controls homepage structure, CMS controls content** — The homepage narrative arc (promo → menu → advantages → resources → testimonials → video → contact → visit map) is hard-coded. The CMS editor can add, remove, or edit sections, but cannot reorder them. This preserves the intentional patient journey.

## Language

- **Primary locales:** Greek (`el`), Russian (`ru`)
- **No cross-locale fallback** — each locale is independent
- **Copy source:** CMS fields + `frontend/src/lib/i18n/*` for UI strings
