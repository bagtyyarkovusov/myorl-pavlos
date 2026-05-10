#!/usr/bin/env node
'use strict';

/**
 * Bulk-update footerCategory values for Strapi pages.
 *
 * Usage:
 *   cd backend && node scripts/update-footer-categories.js --rules scripts/footer-rules.json [--dry-run]
 *
 * The rules file is a JSON object mapping slug → footerCategory:
 *   {
 *     "yperesies": "services",
 *     "klinikes": "services",
 *     "patients": "patients",
 *     "prices": "patients",
 *     "about": "company"
 *   }
 *
 * Pages not listed in the rules file are left unchanged.
 * Only pages currently set to "none" are updated (unless --force is passed).
 */

const fs = require('fs/promises');
const path = require('path');
const core = require('@strapi/core');

const VALID_CATEGORIES = new Set(['services', 'patients', 'company', 'none']);

function parseArgs(argv) {
  const args = {
    rules: '',
    dryRun: false,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--rules' && next) {
      args.rules = next;
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg === '--force') {
      args.force = true;
      continue;
    }
  }

  if (!args.rules) {
    throw new Error('--rules <path-to-json> is required');
  }

  return args;
}

async function loadRules(rulesPath) {
  const raw = await fs.readFile(path.resolve(rulesPath), 'utf8');
  const rules = JSON.parse(raw);

  if (typeof rules !== 'object' || rules === null || Array.isArray(rules)) {
    throw new Error('Rules file must be a JSON object: { slug: category, ... }');
  }

  for (const [slug, category] of Object.entries(rules)) {
    if (slug.startsWith('_')) continue; // skip metadata keys like "_comment"
    if (!VALID_CATEGORIES.has(category)) {
      throw new Error(
        `Invalid category "${category}" for slug "${slug}". ` +
          `Valid values: ${[...VALID_CATEGORIES].join(', ')}`
      );
    }
  }

  return rules;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rules = await loadRules(args.rules);
  const ruleSlugs = new Set(Object.keys(rules).filter((k) => !k.startsWith('_')));

  console.log(`[footer-cats] Loading Strapi...`);
  const appContext = await core.compileStrapi();
  const app = await core.createStrapi(appContext).load();

  const ok = [];
  const skipped = [];
  const errors = [];

  try {
    // Strapi v5 Document API returns pages for the default locale when no locale is specified.
    // We query both locales explicitly since footerCategory is not localized (document-level field),
    // but we need to touch each locale entry to ensure the update propagates correctly.
    const locales = ['el', 'ru'];
    const allPages = [];
    for (const locale of locales) {
      const pages = await app.documents('api::page.page').findMany({
        fields: ['documentId', 'slug', 'locale', 'title', 'footerCategory'],
        locale,
        status: 'draft',
      });
      allPages.push(...pages);
    }

    // Deduplicate by documentId+locale (safety)
    const seen = new Set();
    const pages = [];
    for (const p of allPages) {
      const key = `${p.documentId}-${p.locale}`;
      if (!seen.has(key)) {
        seen.add(key);
        pages.push(p);
      }
    }

    console.log(`[footer-cats] Found ${pages.length} pages`);
    console.log(`[footer-cats] Rules cover ${ruleSlugs.size} slugs`);
    console.log(`[footer-cats] Dry run: ${args.dryRun}`);
    console.log('');

    for (const page of pages) {
      const slug = page.slug;
      const locale = page.locale;
      const documentId = page.documentId;
      const current = page.footerCategory || 'none';
      const target = rules[slug];

      if (!target) {
        skipped.push({ documentId, locale, slug, reason: 'no-rule' });
        continue;
      }

      if (current === target) {
        skipped.push({ documentId, locale, slug, reason: 'already-set' });
        continue;
      }

      if (current !== 'none' && !args.force) {
        skipped.push({
          documentId,
          locale,
          slug,
          reason: 'already-custom',
          current,
          target,
        });
        console.log(
          `[footer-cats] SKIP (custom) ${slug} (${locale}): current="${current}" target="${target}" (use --force to override)`
        );
        continue;
      }

      if (args.dryRun) {
        ok.push({
          documentId,
          locale,
          slug,
          action: 'would-update',
          current,
          target,
        });
        console.log(
          `[footer-cats] DRY-RUN ${slug} (${locale}): "${current}" → "${target}"`
        );
        continue;
      }

      try {
        await app.documents('api::page.page').update({
          documentId,
          locale,
          status: 'draft',
          data: { footerCategory: target },
        });

        await app.documents('api::page.page').publish({
          documentId,
          locale,
        });

        ok.push({ documentId, locale, slug, current, target });
        console.log(`[footer-cats] UPDATED ${slug} (${locale}): "${current}" → "${target}"`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ documentId, locale, slug, target, error: message });
        console.error(`[footer-cats] FAILED ${slug} (${locale}): ${message}`);
      }
    }
  } finally {
    await app.destroy();
  }

  console.log('');
  console.log('━'.repeat(60));
  console.log('SUMMARY');
  console.log('━'.repeat(60));
  console.log(`Updated:   ${ok.length}`);
  console.log(`Skipped:   ${skipped.length}`);
  console.log(`Errors:    ${errors.length}`);
  console.log('');

  if (errors.length > 0) {
    console.error('Errors:');
    for (const e of errors) {
      console.error(`  - ${e.slug} (${e.locale}): ${e.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[footer-cats] Fatal: ${message}`);
  process.exitCode = 1;
});
