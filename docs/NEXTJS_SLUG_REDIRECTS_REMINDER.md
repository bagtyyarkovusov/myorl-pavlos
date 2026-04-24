# Next.js: non-ASCII MODX paths → Strapi ASCII slugs

Strapi `Page.slug` is a **`uid`** (ASCII only). MODX **`alias`** values that contain **Cyrillic** (or other non-ASCII scripts) are stored in Strapi as **transliterated ASCII**. Public URLs that still use the old Unicode segments **must** be handled in the Next.js app.

## Do not ship Next without these redirects

1. Copy [`slug_redirects_next.json`](../slug_redirects_next.json) into your Next repo (or regenerate with [`emit_slug_redirects.py`](../emit_slug_redirects.py) after each slug parity run).
2. Wire middleware or `next.config` using the pattern in [`examples/next_slug_redirects_loader.mjs`](../examples/next_slug_redirects_loader.mjs) (`decodeURIComponent` on the request path before lookup).
3. Re-run [`slug_migration_audit.py`](../slug_migration_audit.py) before release; `strict_verification_passed` must be **true**.

## RU locale — four `non_ascii_modx_alias` rows (verify in `slug_parity_report.json`)

| MODX id | Strapi `documentId` | MODX `alias` (Unicode) | Strapi slug (canonical) | `toPath` |
|--------|---------------------|-------------------------|---------------------------|----------|
| 323 | `zpkmxzdqwpf1q6wn27xa7x6a` | пластика-лица | `plastika-litsa` | `/ru/plastika-litsa` |
| 380 | `mals56qxfw1ckzcm9jm3kq1j` | блефаропластика-пластика-глаз | `blefaroplastika-plastika-glaz` | `/ru/blefaroplastika-plastika-glaz` |
| 381 | `b52sj2toic4uiq10n3dx973z` | лазерная-блефаропластика | `lazernaia-blefaroplastika` | `/ru/lazernaia-blefaroplastika` |
| 417 | `or75ksubaq5h2exns2uga6k0` | πολιτική-απορρήτου (Greek script in `rus` context) | `politike-aporretou` | `/ru/politike-aporretou` |

The last row is **not Cyrillic** but is still **non-ASCII** and must be included in the same redirect strategy.

## Related tooling

- [`import_policy.md`](../import_policy.md) — full slug parity + redirect pipeline
- [`slug_migration_verification_audit.json`](../slug_migration_verification_audit.json) — latest automated audit output
