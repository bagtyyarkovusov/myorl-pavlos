---
module: Examples
symbols: 14 (9 + 5)
cohesion: ~94%
source: gitnexus_cypher (cluster="Examples")
---

# Module: Examples — reference implementations and redirect loader

> Standalone example files demonstrating DTO usage patterns and a Next.js slug-redirect loader. Not imported by production code — these are reference artifacts.

## Code location

| Directory | Purpose |
| --- | --- |
| `examples/` | DTO usage examples + redirect manifest loader |

## Members

### Main cluster (9 symbols)

| Symbol | File | Purpose |
| --- | --- | --- |
| `toPageDTO` | `examples/next_page_dto.ts` | Reference Page DTO construction |
| `toPageMetadataInput` | `examples/next_page_dto.ts` | Reference metadata input shape |
| `toPageRefDTO` | `examples/next_page_dto.ts` | Reference page-ref DTO |
| `toMediaDTO` | `examples/next_page_dto.ts` | Reference media DTO |
| `toContactDTO` | `examples/next_page_dto.ts` | Reference contact DTO (removed from production in section pipeline unification) |
| `toSemanticSections` | `examples/next_page_dto.ts` | Reference section grouping |
| `toSocialLinkDTO` | `examples/next_page_dto.ts` | Reference social-link DTO |
| `deriveSeoTitle` | `examples/next_page_dto.ts` | Reference SEO title derivation |
| `deriveSocialPlatform` | `examples/next_page_dto.ts` | Reference platform inference |
| `isFrontendNativeSystemLayout` | `examples/next_page_dto.ts` | Reference layout check |
| `normalizeOptionalText` | `examples/next_page_dto.ts` | Reference text normalizer |
| `safeHostname` | `examples/next_page_dto.ts` | Reference hostname sanitizer |

### Redirect loader sub-cluster (2 symbols)

| Symbol | File | Purpose |
| --- | --- | --- |
| `normalizePathnameForRedirectLookup` | `examples/next_slug_redirects_loader.mjs` | Path normalization for redirect matching |
| `redirectFromSlugManifest` | `examples/next_slug_redirects_loader.mjs` | Redirect resolution from manifest |

### Proxy test members (2 symbols)

| Symbol | File | Purpose |
| --- | --- | --- |
| `proxy` | `frontend/src/proxy.ts` | Locale-aware reverse proxy |
| `clone` | `frontend/src/proxy.test.ts` | Test utility |

## Notes

- **Not production code.** The `examples/` directory provides reference implementations for DTO patterns. Breaking changes here don't affect the build.
- **Misclassified symbols.** `proxy.ts` and its test ended up in this cluster — they are production code for locale-aware proxying. This is a known clustering quirk; logically they belong in a networking module.

## Related

- [[cms]] — production DTO layer these examples reference
- [[00-MOC-Frontend]] — frontend entry points
