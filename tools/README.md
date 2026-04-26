# Tools

This folder owns migration, audit, backfill, and Strapi maintenance scripts.

Run scripts from the project root, for example:

```bash
python3 tools/nextjs_readiness_gate.py --skip-live-strapi
```

Temporary root compatibility wrappers remain for:

- `nextjs_readiness_gate.py`
- `audit_nextjs_content_hygiene.py`
- `strapi_importer.py`
- `sync_navigation_from_pages.py`
