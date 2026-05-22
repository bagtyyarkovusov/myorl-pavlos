#!/usr/bin/env node
'use strict';

/**
 * One-time navigation audit: unhide, reparent, or delete mis-placed pages.
 *
 * Usage:
 *   cd backend && node scripts/apply-navigation-audit.js          # dry-run (default)
 *   cd backend && node scripts/apply-navigation-audit.js --apply
 *
 * Idempotent — skips rows already matching the target state.
 */

const core = require('@strapi/core');

const LOCALES = ['el', 'ru'];

const UNHIDE_AT_MENU = {
  slug: 'viografiko',
  locales: LOCALES,
};

const REPARENT_TO_PRICING = {
  slug: 'plirofories-gia-asfalismenous-edoeap-kai-trapeza-tis-ellados',
  locales: ['el'],
  parentSlug: 'timokatalogos',
};

const UNHIDE_UNDER_PARENT = {
  slug: 'botulinotherapia-ru',
  locales: ['ru'],
};

const DELETE_DOCUMENT = {
  slug: 'ru-page',
};

function parseArgs(argv) {
  return { apply: argv.includes('--apply') };
}

async function findPageBySlug(app, slug, locale) {
  const pages = await app.documents('api::page.page').findMany({
    filters: { slug: { $eq: slug } },
    locale,
    status: 'draft',
    fields: ['documentId', 'slug', 'locale', 'title', 'hideFromMenu', 'menuIndex'],
    populate: {
      parentPage: { fields: ['documentId', 'slug', 'title'] },
    },
  });
  return pages[0] ?? null;
}

async function findPublished(app, documentId, locale) {
  const page = await app.documents('api::page.page').findOne({
    documentId,
    locale,
    status: 'published',
    fields: ['documentId'],
  });
  return Boolean(page);
}

async function maxChildMenuIndex(app, parentDocumentId, locale) {
  const children = await app.documents('api::page.page').findMany({
    filters: {
      parentPage: { documentId: { $eq: parentDocumentId } },
    },
    locale,
    status: 'draft',
    fields: ['menuIndex'],
  });
  if (children.length === 0) return -1;
  return Math.max(...children.map((c) => c.menuIndex ?? 0));
}

async function updatePage(app, { documentId, locale, data, hasPublished, apply, label }) {
  if (!apply) {
    console.log(`[nav-audit] DRY-RUN ${label}`);
    return { ok: true, dryRun: true };
  }

  await app.documents('api::page.page').update({
    documentId,
    locale,
    status: 'draft',
    data,
  });

  if (hasPublished) {
    await app.documents('api::page.page').publish({ documentId, locale });
  }

  console.log(`[nav-audit] APPLIED ${label}`);
  return { ok: true, dryRun: false };
}

async function applyUnhide(app, spec, apply, ok, skipped, errors) {
  for (const locale of spec.locales) {
    const page = await findPageBySlug(app, spec.slug, locale);
    if (!page) {
      skipped.push({ action: 'unhide', slug: spec.slug, locale, reason: 'not-found' });
      console.log(`[nav-audit] SKIP unhide ${spec.slug} (${locale}): not found`);
      continue;
    }

    if (page.hideFromMenu === false) {
      skipped.push({ action: 'unhide', slug: spec.slug, locale, reason: 'already-visible' });
      console.log(`[nav-audit] SKIP unhide ${spec.slug} (${locale}): already menu-visible`);
      continue;
    }

    try {
      const hasPublished = await findPublished(app, page.documentId, locale);
      const result = await updatePage(app, {
        documentId: page.documentId,
        locale,
        data: { hideFromMenu: false },
        hasPublished,
        apply,
        label: `unhide ${spec.slug} (${locale})`,
      });
      ok.push({ action: 'unhide', slug: spec.slug, locale, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ action: 'unhide', slug: spec.slug, locale, error: message });
      console.error(`[nav-audit] FAILED unhide ${spec.slug} (${locale}): ${message}`);
    }
  }
}

async function applyReparent(app, spec, apply, ok, skipped, errors) {
  for (const locale of spec.locales) {
    const page = await findPageBySlug(app, spec.slug, locale);
    if (!page) {
      skipped.push({ action: 'reparent', slug: spec.slug, locale, reason: 'not-found' });
      console.log(`[nav-audit] SKIP reparent ${spec.slug} (${locale}): not found`);
      continue;
    }

    const parent = await findPageBySlug(app, spec.parentSlug, locale);
    if (!parent) {
      errors.push({
        action: 'reparent',
        slug: spec.slug,
        locale,
        error: `parent ${spec.parentSlug} not found`,
      });
      console.error(
        `[nav-audit] FAILED reparent ${spec.slug} (${locale}): parent ${spec.parentSlug} not found`
      );
      continue;
    }

    const currentParentId = page.parentPage?.documentId ?? null;
    const needsReparent = currentParentId !== parent.documentId;
    const needsUnhide = page.hideFromMenu !== false;

    if (!needsReparent && !needsUnhide) {
      skipped.push({ action: 'reparent', slug: spec.slug, locale, reason: 'already-set' });
      console.log(`[nav-audit] SKIP reparent ${spec.slug} (${locale}): already correct`);
      continue;
    }

    const targetMenuIndex = needsReparent
      ? (await maxChildMenuIndex(app, parent.documentId, locale)) + 1
      : page.menuIndex;

    const data = {
      hideFromMenu: false,
      menuIndex: targetMenuIndex,
    };

    if (needsReparent) {
      data.parentPage = { connect: [{ documentId: parent.documentId }] };
    }

    try {
      const hasPublished = await findPublished(app, page.documentId, locale);
      const result = await updatePage(app, {
        documentId: page.documentId,
        locale,
        data,
        hasPublished,
        apply,
        label: `reparent ${spec.slug} (${locale}) -> ${spec.parentSlug} menuIndex=${targetMenuIndex}`,
      });
      ok.push({ action: 'reparent', slug: spec.slug, locale, parentSlug: spec.parentSlug, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ action: 'reparent', slug: spec.slug, locale, error: message });
      console.error(`[nav-audit] FAILED reparent ${spec.slug} (${locale}): ${message}`);
    }
  }
}

async function applyDelete(app, spec, apply, ok, skipped, errors) {
  let foundAny = false;

  for (const locale of LOCALES) {
    const page = await findPageBySlug(app, spec.slug, locale);
    if (!page) continue;
    foundAny = true;

    if (!apply) {
      console.log(`[nav-audit] DRY-RUN would unpublish+delete ${spec.slug} (${locale})`);
      ok.push({ action: 'delete', slug: spec.slug, locale, dryRun: true });
      continue;
    }

    try {
      const hasPublished = await findPublished(app, page.documentId, locale);
      if (hasPublished) {
        await app.documents('api::page.page').unpublish({ documentId: page.documentId, locale });
      }
      console.log(`[nav-audit] UNPUBLISHED ${spec.slug} (${locale})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ action: 'unpublish', slug: spec.slug, locale, error: message });
      console.error(`[nav-audit] FAILED unpublish ${spec.slug} (${locale}): ${message}`);
    }
  }

  if (!foundAny) {
    skipped.push({ action: 'delete', slug: spec.slug, reason: 'not-found' });
    console.log(`[nav-audit] SKIP delete ${spec.slug}: not found in any locale`);
    return;
  }

  const anchor = await findPageBySlug(app, spec.slug, 'el');
  const documentId = anchor?.documentId;
  if (!documentId) {
    const ruAnchor = await findPageBySlug(app, spec.slug, 'ru');
    if (!ruAnchor) return;
  }

  const docId =
    anchor?.documentId ?? (await findPageBySlug(app, spec.slug, 'ru'))?.documentId;
  if (!docId) return;

  if (!apply) {
    console.log(`[nav-audit] DRY-RUN would delete document ${spec.slug} (${docId})`);
    ok.push({ action: 'delete-document', slug: spec.slug, documentId: docId, dryRun: true });
    return;
  }

  try {
    await app.documents('api::page.page').delete({ documentId: docId });
    console.log(`[nav-audit] DELETED document ${spec.slug} (${docId})`);
    ok.push({ action: 'delete-document', slug: spec.slug, documentId: docId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({ action: 'delete-document', slug: spec.slug, documentId: docId, error: message });
    console.error(`[nav-audit] FAILED delete ${spec.slug}: ${message}`);
  }
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));

  console.log(`[nav-audit] Loading Strapi...`);
  console.log(`[nav-audit] Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log('');

  const appContext = await core.compileStrapi();
  const app = await core.createStrapi(appContext).load();

  const ok = [];
  const skipped = [];
  const errors = [];

  try {
    await applyUnhide(app, UNHIDE_AT_MENU, apply, ok, skipped, errors);
    await applyReparent(app, REPARENT_TO_PRICING, apply, ok, skipped, errors);
    await applyUnhide(app, UNHIDE_UNDER_PARENT, apply, ok, skipped, errors);
    await applyDelete(app, DELETE_DOCUMENT, apply, ok, skipped, errors);
  } finally {
    await app.destroy();
  }

  console.log('');
  console.log('━'.repeat(60));
  console.log('SUMMARY');
  console.log('━'.repeat(60));
  console.log(`Applied / would apply: ${ok.length}`);
  console.log(`Skipped:               ${skipped.length}`);
  console.log(`Errors:                ${errors.length}`);

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[nav-audit] Fatal: ${message}`);
  process.exitCode = 1;
});
