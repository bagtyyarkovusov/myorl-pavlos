# Content Promotion: Dev → Production

Use `strapi transfer` to push content from dev Strapi to production Strapi.
This is the canonical workflow for promoting content changes (pages, tags, files,
etc.) without full database cutover.

## When to Use

- You made content edits in the dev Strapi admin panel and want them live
- You added new pages, updated existing content, or changed navigation
- You need to sync media files added in dev

## Prerequisites

1. Both dev and production Strapi instances are running
2. You have a **transfer token** on the production instance
3. Both instances use the **same `TRANSFER_TOKEN_SALT`**

### Generate a Transfer Token on Production

```bash
# On the production server
docker exec gemini-strapi-prod npx strapi transfer --to-token generate
```

Or create one in the Strapi admin panel: Settings → Transfer Tokens → Create.

Copy the generated token — you'll need it for the push command.

## Push Content (Dev → Production)

```bash
# From the dev machine
docker exec gemini-strapi-dev npx strapi transfer \
  --to https://myorl.gr \
  --to-token <production-transfer-token> \
  --force
```

### Pull Content (Production → Dev)

```bash
# From the dev machine — pull production content into dev
docker exec gemini-strapi-dev npx strapi transfer \
  --from https://myorl.gr \
  --from-token <production-transfer-token> \
  --force
```

## Transfer Only Specific Data Types

```bash
# Content only (no files, no config)
docker exec gemini-strapi-dev npx strapi transfer \
  --to https://myorl.gr \
  --to-token <token> \
  --only content \
  --force

# Files only
docker exec gemini-strapi-dev npx strapi transfer \
  --to https://myorl.gr \
  --to-token <token> \
  --only files \
  --force
```

## Safety

- **Always back up production before a full transfer:** see [postgres-backup.md](./postgres-backup.md)
- Use `--only content` when you only changed text/entries (not files) — faster, less risk
- Test with `--exclude files` first for a dry-run feel
- Remove `--force` for interactive confirmation of every change

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Transfer token is invalid` | Token wrong or salt mismatch | Verify `TRANSFER_TOKEN_SALT` matches between dev and prod |
| `Connection refused` | Prod Strapi not reachable | Check firewall/network, verify URL is correct |
| `Schema mismatch` | Content-type structure differs | Strapi versions must match; run `npm run build` on both |
| Missing media files | Files transferred but not linked | Re-run with `--only files`; check `public/uploads/` on prod |

## Alternative: Full Database Cutover

When you need to replace the entire production database (new deploy, major migration), use the [production-cutover.md](./production-cutover.md) runbook instead.
