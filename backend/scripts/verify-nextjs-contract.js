'use strict';

const fs = require('fs/promises');
const path = require('path');
const sqlite3 = require('better-sqlite3');
const core = require('@strapi/core');

const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND_ROOT = path.join(ROOT, 'backend');
const DB_PATH = path.join(ROOT, 'backend', '.tmp', 'data.db');
const PAGE_SCHEMA_PATH = path.join(ROOT, 'backend', 'src', 'api', 'page', 'content-types', 'page', 'schema.json');
const TAG_SCHEMA_PATH = path.join(ROOT, 'backend', 'src', 'api', 'tag', 'content-types', 'tag', 'schema.json');
const DTO_EXAMPLE_PATH = path.join(ROOT, 'examples', 'next_page_dto.ts');

async function loadDotenv(filePath, { fillEmpty = false } = {}) {
  const raw = await fs.readFile(filePath, 'utf8').catch(() => '');
  if (!raw) {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }
    const [keyPart, ...valueParts] = trimmed.split('=');
    const key = keyPart.trim();
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (!key) {
      continue;
    }
    if (fillEmpty ? !process.env[key] : process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function findPrivateKeys(value, hits = [], trail = '') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findPrivateKeys(item, hits, `${trail}[${index}]`);
    });
    return hits;
  }

  if (!value || typeof value !== 'object') {
    return hits;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextTrail = trail ? `${trail}.${key}` : key;
    if (key === 'templateId' || key === 'pageBlocks' || key === 'legacySourceResourceId') {
      hits.push(nextTrail);
    }
    findPrivateKeys(child, hits, nextTrail);
  }

  return hits;
}

function pageTypeSamples(database) {
  const rows = database
    .prepare(
      `
      SELECT page_type, document_id, locale
      FROM pages
      WHERE published_at IS NOT NULL
      GROUP BY page_type
      ORDER BY page_type
      `
    )
    .all();
  return rows;
}

function slugCollisions(database) {
  return database
    .prepare(
      `
      SELECT locale, slug, COUNT(*) AS count
      FROM pages
      WHERE published_at IS NOT NULL
      GROUP BY locale, slug
      HAVING COUNT(*) > 1
      `
    )
    .all();
}

function legacyDuplicationCount(database) {
  const rows = database
    .prepare(
      `
      WITH page_fields AS (
        SELECT
          p.id,
          p.page_type,
          SUM(CASE WHEN pc.field = 'pageBlocks' THEN 1 ELSE 0 END) AS has_pageblocks,
          SUM(CASE WHEN pc.field = 'pageSections' THEN 1 ELSE 0 END) AS has_pageSections,
          SUM(CASE WHEN pc.field = 'faqSection' THEN 1 ELSE 0 END) AS has_faqSection,
          SUM(CASE WHEN pc.field = 'accordionSection' THEN 1 ELSE 0 END) AS has_accordionSection,
          SUM(CASE WHEN pc.field = 'tabsSection' THEN 1 ELSE 0 END) AS has_tabsSection,
          SUM(CASE WHEN pc.field = 'gallerySection' THEN 1 ELSE 0 END) AS has_gallerySection,
          SUM(CASE WHEN pc.field = 'contactSection' THEN 1 ELSE 0 END) AS has_contactSection
        FROM pages p
        LEFT JOIN pages_cmps pc ON pc.entity_id = p.id
        WHERE p.published_at IS NOT NULL
        GROUP BY p.id
      )
      SELECT COUNT(*) AS count
      FROM page_fields
      WHERE has_pageblocks > 0 AND (
        (page_type = 'home' AND has_pageSections > 0) OR
        (page_type = 'faq' AND has_faqSection > 0) OR
        (page_type = 'accordion' AND has_accordionSection > 0) OR
        (page_type = 'tabs' AND has_tabsSection > 0) OR
        (page_type = 'gallery' AND has_gallerySection > 0) OR
        (page_type = 'contact' AND has_contactSection > 0)
      )
      `
    )
    .get();
  return Number(rows?.count || 0);
}

async function main() {
  await loadDotenv(path.join(ROOT, '.env'));
  await loadDotenv(path.join(BACKEND_ROOT, '.env'), { fillEmpty: true });
  process.chdir(BACKEND_ROOT);

  const pageSchema = JSON.parse(await fs.readFile(PAGE_SCHEMA_PATH, 'utf8'));
  const tagSchema = JSON.parse(await fs.readFile(TAG_SCHEMA_PATH, 'utf8'));
  const database = sqlite3(DB_PATH, { readonly: true });

  const result = {
    checks: {},
    failures: [],
    representativePages: [],
  };

  result.checks.menuTitleInSchema = Boolean(pageSchema.attributes.menuTitle);
  result.checks.pageBlocksPrivate = Boolean(pageSchema.attributes.pageBlocks?.private);
  result.checks.templateIdPrivate = Boolean(pageSchema.attributes.templateId?.private);
  result.checks.tagSlugPresent = Boolean(tagSchema.attributes.slug);
  result.checks.dtoExampleExists = await fs
    .access(DTO_EXAMPLE_PATH)
    .then(() => true)
    .catch(() => false);

  if (!result.checks.menuTitleInSchema) {
    result.failures.push('Page schema is missing menuTitle.');
  }
  if (!result.checks.pageBlocksPrivate || !result.checks.templateIdPrivate) {
    result.failures.push('Legacy page fields are not private in the schema.');
  }
  if (!result.checks.tagSlugPresent) {
    result.failures.push('Tag schema is missing slug.');
  }
  if (!result.checks.dtoExampleExists) {
    result.failures.push('Next DTO example is missing.');
  }

  result.checks.slugCollisions = slugCollisions(database);
  if (result.checks.slugCollisions.length > 0) {
    result.failures.push('Published slug collisions still exist.');
  }

  result.checks.legacyDuplicationLocalized = legacyDuplicationCount(database);
  if (result.checks.legacyDuplicationLocalized > 0) {
    result.failures.push('Published pages still carry both semantic sections and pageBlocks.');
  }

  const appContext = await core.compileStrapi();
  const app = await core.createStrapi(appContext).load();

  try {
    const samples = pageTypeSamples(database);
    const pageSchemaModel = app.contentType('api::page.page');

    for (const sample of samples) {
      const document = await app.documents('api::page.page').findOne({
        documentId: sample.document_id,
        locale: sample.locale,
        status: 'published',
        populate: {
          pageSections: {
            on: {
              'sections.promo-slider': { populate: { slides: { populate: ['targetPage', 'image'] } } },
              'sections.linked-resources': { populate: { items: { populate: ['targetPage'] } } },
              'sections.social-links': { populate: { links: true } },
              'sections.video': { populate: { videos: { populate: ['videoMp4', 'videoWebm', 'thumbnail'] } } },
              'sections.advantages': { populate: { items: true } },
            },
          },
          faqSection: { populate: { items: true } },
          accordionSection: { populate: { items: true } },
          tabsSection: { populate: { items: true } },
          gallerySection: { populate: { items: { populate: ['image'] } } },
          contactSection: { populate: { details: true, clinics: true } },
          tags: true,
          parentPage: true,
          featuredImage: true,
          imageCenter: true,
          seo: true,
        },
      });

      const sanitized = await app.contentAPI.sanitize.output(document, pageSchemaModel, { auth: null });
      const privateHits = findPrivateKeys(sanitized);

      result.representativePages.push({
        pageType: sample.page_type,
        documentId: sample.document_id,
        locale: sample.locale,
        privateHits,
      });

      if (privateHits.length > 0) {
        result.failures.push(
          `Sanitized ${sample.page_type} payload still exposes private fields: ${privateHits.join(', ')}`
        );
      }
    }
  } finally {
    await app.destroy();
    database.close();
  }

  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.failures.length > 0 ? 1 : 0;
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[verify-nextjs-contract] Fatal: ${message}`);
  process.exitCode = 1;
});
