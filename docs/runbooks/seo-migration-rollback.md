# SEO Migration Rollback Runbook

> **Scope:** MODX → Strapi/Next.js same-domain cutover on `myorl.gr`.
> Per [PRD #152][prd-152] and [ADR-013][adr-013], the legacy MODX site stays warm
> at `legacy.myorl.gr` for ≥90 days post-cutover as a rollback safety net.

## Architecture

```
                           ┌─────────────────────┐
                    ┌──────│  DNS Registrar       │──────┐
                    │      │  (user-supplied)     │      │
                    │      └─────────────────────┘      │
                    ▼                                    ▼
          myorl.gr  A  →  Railway IP          legacy.myorl.gr  A  →  MODX IP
                    │                                    │
                    ▼                                    ▼
      ┌──────────────────────────┐       ┌──────────────────────────┐
      │  Railway (Next.js 16 +   │       │  Legacy MODX server      │
      │  Strapi 5 + PostgreSQL)  │       │  (public_html/ intact)   │
      └──────────────────────────┘       └──────────────────────────┘
```

## Pre-Flight Checklist

Before flipping DNS at the registrar, run these checks in order:

- [ ] **GSC baseline captured:** `python3 tools/snapshot_gsc_baseline.py` — top-100 queries and landing pages saved for post-launch comparison.
- [ ] **All audits pass:** external links, SEO meta, slug quality, H1 hierarchy, alt text — no launch-blocking findings.
- [ ] **Staging smoke test:** full-site crawl on staging URL returns 0 unexpected 4xx/5xx.
- [ ] **DNS pre-flight:** `python3 tools/check_dns_cutover_readiness.py --apex-ip <NEW_IP> --legacy-ip <LEGACY_IP>` (or set `CUTOVER_APEX_IP` / `CUTOVER_LEGACY_IP` env vars). This verifies:
  - `myorl.gr` resolves to the **new** Railway infrastructure IP.
  - `legacy.myorl.gr` resolves to the **existing** MODX server IP.
  
  Both must pass before proceeding.

## Registrar DNS Flip Procedure

> **Registrar:** Pavlos's team must supply the registrar name (e.g., Papaki, Top.Host, Namecheap) and account access. The record locations below assume a standard DNS zone editor.

### Step 1: Record the current DNS state

Before making any changes, screenshot or export the current zone file. You need:

- The current `myorl.gr` A record value (the MODX server IP).
- Any existing `www` CNAME or A record.
- Any existing subdomain records (`legacy`, `mail`, etc.).
- The current TTL values.

### Step 2: Create the legacy standby record

If `legacy.myorl.gr` does not already exist:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `legacy` | `<MODX_SERVER_IP>` | 300 |

This preserves access to the MODX site at `http://legacy.myorl.gr` after the apex flips. Keep TTL low (300s) so the record propagates quickly.

### Step 3: Verify the legacy record

```bash
# Wait for TTL to expire, then verify resolution
python3 tools/check_dns_cutover_readiness.py \
  --apex-ip <CURRENT_MODX_IP> \
  --legacy-ip <MODX_SERVER_IP>

# Or test directly
dig +short legacy.myorl.gr
```

### Step 4: Flip the apex

Update the `myorl.gr` A record to point at the Railway infrastructure:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` (or apex) | `<RAILWAY_IP>` | 300 |

Also update `www` if present:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `www` | `myorl.gr` | 300 |

### Step 5: Verify post-flip

```bash
# Both must pass now
python3 tools/check_dns_cutover_readiness.py \
  --apex-ip <RAILWAY_IP> \
  --legacy-ip <MODX_SERVER_IP>
```

Then manually verify:

```bash
# Apex should return 308 to /el from Railway
curl -sI https://myorl.gr | grep -E 'HTTP|Location'

# Legacy should serve MODX content
curl -sI http://legacy.myorl.gr | grep -E 'HTTP|Server'
```

### Step 6: Lower TTL after propagation

After 24-48 hours with no issues, increase TTL to 3600 (1 hour) or your standard TTL for both records. Low TTL increases DNS query volume and can slow resolution marginally.

## Rollback Trigger Criteria

Rollback is warranted if **any** of these conditions are met in the first 7 days post-cutover:

1. **Primary trigger:** Top-20 GSC queries lose ≥30% impressions in week 1 vs. the pre-launch baseline (captured by `tools/snapshot_gsc_baseline.py`).
2. **Availability trigger:** The new site is down for >15 minutes cumulatively in any 24-hour window and the root cause cannot be fixed within 30 minutes.
3. **Content trigger:** A critical business page (home page, top-5 service pages, contact page) returns 4xx/5xx or is served empty for >1 hour.

### How to check

```bash
# 7 days post-launch, compare GSC data
python3 tools/snapshot_gsc_baseline.py --compare artifacts/gsc/pre_launch_baseline.json
```

If the script is unavailable, manually compare GSC → Performance → Queries (compare week-over-week, filtered to the top 20 queries from the baseline period).

## Rollback Procedure: DNS Flip Back to Legacy MODX

If trigger criteria are met, execute the rollback:

### 1. Notify stakeholders

Post in the team communication channel: "Rollback initiated — reverting DNS to legacy MODX at `legacy.myorl.gr`. ETA 15-60 minutes depending on DNS propagation."

### 2. Flip the apex back

In the registrar DNS zone editor:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` (or apex) | `<MODX_SERVER_IP>` | 300 |

### 3. Verify the rollback

```bash
# Apex should now resolve to MODX IP
python3 tools/check_dns_cutover_readiness.py \
  --apex-ip <MODX_SERVER_IP> \
  --legacy-ip <MODX_SERVER_IP>

# MODX should serve at apex
curl -sI https://myorl.gr | grep 'Server'
```

### 4. Monitor

Watch GSC for 48 hours post-rollback. Google typically re-crawls and re-indexes within 24-72 hours after a same-domain DNS flip. The legacy ranking signals should begin recovering once Googlebot sees the original URLs back at the apex.

### 5. Retrospective

Before re-attempting cutover, identify which decision caused the decay:

- URL Mapping miss? Check `tools/audit_legacy_urls.py` output and verify all legacy URLs resolve.
- Broken JSON-LD? Validate with Google's Rich Results Test.
- E-A-T gap? Verify dates, reviewer attribution, and Physician schema on article pages.
- ISR stale content? Check `revalidate` tags and webhook delivery.

Fix the root cause on the new site, re-run the pre-flight checklist, and schedule a new cutover window.

## Why 90 Days

Google's re-crawl-and-stabilize cycle for a same-domain transition follows a predictable pattern:

- **Week 1-2:** Googlebot re-discovers the site at the new infrastructure. Crawl rate increases temporarily. Ranking fluctuations are normal and expected.
- **Week 3-4:** Index stabilizes. Most legacy URLs transfer equity through the 308/301 mappings. GSC coverage report converges.
- **Month 2:** Long-tail rankings settle. Core Web Vital signals accumulate from real-user data (CrUX).
- **Month 3:** Full equity transfer. The site's ranking profile should match or exceed the baseline.

Beyond 90 days, the rollback path closes because:

1. Google has fully re-indexed the new site and transferred ranking equity. A rollback at this point would start the cycle over, causing a second round of equity transfer losses.
2. New content created post-cutover (new Strapi pages, URL Mapping entries) would not exist on the legacy MODX site — rolling back would 404 those URLs.
3. External sites and backlinks may have updated their links to the new URL structure `myorl.gr/el/<slug>`. A rollback to `myorl.gr/<slug>` (MODX) would break those updated references.

## Day-91 Cleanup: "We're Committed"

Once the 90-day window closes and rankings are stable:

### 1. Freeze the legacy MODX server

```bash
# On the MODX server — dump a final backup
mysqldump --all-databases > /root/modx_final_backup_$(date +%Y%m%d).sql

# Archive the entire document root
tar czf /root/public_html_final_$(date +%Y%m%d).tar.gz /var/www/public_html/
```

Download these archives to offline storage (S3, GCS, or team file server). They are the permanent record of the legacy state.

### 2. Decommission the legacy host

```bash
# Option A: If the MODX server is a dedicated VPS
# Cancel the VPS / shut it down through the hosting provider panel

# Option B: If the MODX server is shared hosting
# Remove the A record for legacy.myorl.gr or point it at a static
# "This site has moved" page hosted on the new infrastructure
```

### 3. Remove the legacy DNS record

Delete or comment out the `legacy.myorl.gr` A record from the registrar zone file.

### 4. Archive DNS records

Screenshot the final DNS zone and save alongside the database dump. This is the "shutdown snapshot" — the definitive record of the transition.

### 5. Submit updated sitemap

In GSC, submit the new sitemap (`https://myorl.gr/sitemap.xml`) one final time and monitor the coverage report for 2 weeks. Google should fully converge on the new index without the legacy site.

## Standby Host Decision

> **Decision required from Pavlos's team.** Two options below.

### Option A: Keep MODX running (Recommended)

Keep the existing MODX server at its current IP. Point `legacy.myorl.gr` at it.

| Factor | Assessment |
|--------|-----------|
| Cost | Existing hosting cost (no change) |
| Effort | Zero — server stays running as-is |
| Coverage | Full site browsing, all dynamic features |
| Risk | Server could go down (OS updates, disk full, process crash) |
| Duration | 90 days, then shutdown |

**This is the recommended default.** The server is already running and paid for. No additional work is needed beyond the DNS record.

### Option B: Static CDN snapshot

Run `wget --mirror` against the MODX site, upload the static dump to a CDN bucket, and point `legacy.myorl.gr` at the CDN.

```bash
# Mirror the MODX site to a static dump
wget --mirror --page-requisites --convert-links \
  --adjust-extension --no-host-directories \
  --directory-prefix=static-dump/ \
  https://myorl.gr/
```

| Factor | Assessment |
|--------|-----------|
| Cost | CDN hosting (~$0-5/month for this traffic level) |
| Effort | One-time wget mirror + CDN upload (~2 hours) |
| Coverage | Static pages only — no search, no contact forms, no PHP execution |
| Risk | wget may miss JavaScript-loaded content or POST-only pages |
| Duration | Indefinite (can leave up permanently as an archive) |

**Choose Option B if:** the MODX server contract expires within the 90-day window, or the hosting cost is significant and you'd rather pay CDN rates.

### Decision record

Once the standby venue is chosen, uncomment and fill in the applicable section below:

<!--
**Decision (Option A):**
- MODX server IP: ________
- Hosting provider: ________
- Contract expiry: ________
- Monthly cost: ________

**Decision (Option B):**
- CDN provider: ________
- Bucket URL: ________
- Static dump location: `artifacts/modx-static-dump/`
- Monthly cost: ________
-->

## Further Reading

- [PRD #152 — SEO launch readiness][prd-152]
- [ADR-013 — Canonical Home is `/el`][adr-013]
- [ADR-014 — ISR + tag-based revalidation][adr-014]
- [Production Deployment Runbook](./production-deployment.md)
- [Railway Deployment Runbook](./railway-deployment.md)

[prd-152]: https://github.com/bagtyyarkovusov/myorl-pavlos/issues/152
[adr-013]: ../adr/ADR-013-canonical-home-locale-prefixed.md
[adr-014]: ../adr/ADR-014-isr-revalidation-replaces-force-dynamic.md
