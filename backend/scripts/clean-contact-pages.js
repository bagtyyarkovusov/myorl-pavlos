'use strict';

const fs = require('fs/promises');
const path = require('path');
const core = require('@strapi/core');

const DEFAULT_DOCUMENT_ID = 'nbsun7tvpb5x9cewbhpkvs84';
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function parseArgs(argv) {
  const args = {
    documentId: DEFAULT_DOCUMENT_ID,
    result: '',
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--document-id' && next) {
      args.documentId = next;
      index += 1;
      continue;
    }
    if (arg === '--result' && next) {
      args.result = next;
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      args.dryRun = true;
    }
  }

  if (!args.result) {
    throw new Error('--result is required');
  }

  return args;
}

function buildEmailMarkup(email) {
  return `<div><a href="mailto:${email}" itemprop="email">${email}</a></div>`;
}

function sanitizeRichText(value) {
  const original = typeof value === 'string' ? value : '';
  let next = original;

  const fontTagMatches = next.match(/<\/?font\b[^>]*>/gi) || [];
  const openTelephoneMatches =
    next.match(/<itemprop(?:=|=["'])telephone["']>/gi) || [];
  const closeTelephoneMatches =
    next.match(/<\/itemprop(?:=|=["'])telephone["']>/gi) || [];
  const emptyItemscopeMatches = next.match(/\sitemscope=""/gi) || [];

  next = next.replace(/<\/?font\b[^>]*>/gi, '');
  next = next.replace(/<itemprop(?:=|=["'])telephone["']>/gi, '<span itemprop="telephone">');
  next = next.replace(/<\/itemprop(?:=|=["'])telephone["']>/gi, '</span>');
  next = next.replace(/\sitemscope=""/gi, ' itemscope');
  next = next.replace(/\u00a0/g, ' ');
  next = next.replace(/&nbsp;/gi, ' ');
  next = next.trim();

  return {
    value: next,
    changed: next !== original,
    fontTagsRemoved: fontTagMatches.length,
    telephoneTagFixes: openTelephoneMatches.length + closeTelephoneMatches.length,
    itemscopeFixes: emptyItemscopeMatches.length,
  };
}

function extractEmail(document) {
  const details = document?.contactSection?.details || [];
  for (const detail of details) {
    const raw = typeof detail?.value === 'string' ? detail.value : '';
    const match = raw.match(EMAIL_REGEX);
    if (match) {
      return match[0].toLowerCase();
    }
  }

  const blocks = document?.pageBlocks || [];
  for (const block of blocks) {
    if (block?.__component !== 'blocks.contact-detail') {
      continue;
    }
    const raw = typeof block?.value === 'string' ? block.value : '';
    const match = raw.match(EMAIL_REGEX);
    if (match) {
      return match[0].toLowerCase();
    }
  }

  return null;
}

function normalizeContactDetails(details, email, stats) {
  return (details || []).map((detail) => {
    let value = typeof detail?.value === 'string' ? detail.value : '';
    const type = String(detail?.type || '');
    const hadPlaceholder = value.includes('[[++emailsender]]');

    if (/e-?mail/i.test(type) && (hadPlaceholder || EMAIL_REGEX.test(value))) {
      value = buildEmailMarkup(email);
      stats.emailMarkupNormalized += 1;
      if (hadPlaceholder) {
        stats.placeholderEmailsRemoved += 1;
      }
    }

    const sanitized = sanitizeRichText(value);
    stats.fontTagsRemoved += sanitized.fontTagsRemoved;
    stats.telephoneTagFixes += sanitized.telephoneTagFixes;
    stats.itemscopeFixes += sanitized.itemscopeFixes;
    if (sanitized.changed || value !== detail.value) {
      stats.detailRowsTouched += 1;
    }

    return {
      ...detail,
      value: sanitized.value,
    };
  });
}

function normalizeClinics(clinics, stats) {
  const normalized = [];

  for (const clinic of clinics || []) {
    const name = typeof clinic?.name === 'string' ? clinic.name.trim() : '';
    if (!name) {
      stats.clinicsRemoved += 1;
      continue;
    }

    const sanitized = sanitizeRichText(typeof clinic?.address === 'string' ? clinic.address : '');
    stats.fontTagsRemoved += sanitized.fontTagsRemoved;
    stats.telephoneTagFixes += sanitized.telephoneTagFixes;
    stats.itemscopeFixes += sanitized.itemscopeFixes;
    if (sanitized.changed) {
      stats.clinicRowsTouched += 1;
    }

    normalized.push({
      ...clinic,
      name,
      address: sanitized.value,
    });
  }

  return normalized;
}

function normalizeBlocks(blocks, email, stats) {
  const normalized = [];

  for (const block of blocks || []) {
    if (block?.__component === 'blocks.contact-detail') {
      const [detail] = normalizeContactDetails([block], email, stats);
      normalized.push({
        ...detail,
        __component: 'blocks.contact-detail',
      });
      continue;
    }

    if (block?.__component === 'blocks.clinic') {
      const [clinic] = normalizeClinics([block], stats);
      if (clinic) {
        normalized.push({
          ...clinic,
          __component: 'blocks.clinic',
        });
      }
      continue;
    }

    normalized.push(block);
  }

  return normalized;
}

async function fetchContactDocument(app, documentId, locale) {
  return app.documents('api::page.page').findOne({
    documentId,
    locale,
    status: 'draft',
    populate: {
      contactSection: {
        populate: {
          details: true,
          clinics: true,
        },
      },
      pageBlocks: true,
    },
  });
}

async function hasPublishedDocument(app, documentId, locale) {
  const published = await app.documents('api::page.page').findOne({
    documentId,
    locale,
    status: 'published',
    fields: ['documentId'],
  });

  return Boolean(published);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const resultPath = path.resolve(args.result);
  const appContext = await core.compileStrapi();
  const app = await core.createStrapi(appContext).load();

  const report = {
    documentId: args.documentId,
    dryRun: args.dryRun,
    locales: {},
  };

  try {
    const locales = ['el', 'ru'];
    const documents = {};

    for (const locale of locales) {
      const document = await fetchContactDocument(app, args.documentId, locale);
      if (!document) {
        throw new Error(`Contact page ${args.documentId} ${locale} not found`);
      }
      const published = await hasPublishedDocument(app, args.documentId, locale);
      documents[locale] = document;
      report.locales[locale] = {
        published,
      };
    }

    const fallbackEmail =
      extractEmail(documents.el) ||
      extractEmail(documents.ru);

    if (!fallbackEmail) {
      throw new Error(`No fallback email found for contact page ${args.documentId}`);
    }

    for (const locale of locales) {
      const document = documents[locale];
      const stats = {
        detailRowsTouched: 0,
        clinicRowsTouched: 0,
        clinicsRemoved: 0,
        placeholderEmailsRemoved: 0,
        emailMarkupNormalized: 0,
        fontTagsRemoved: 0,
        telephoneTagFixes: 0,
        itemscopeFixes: 0,
      };

      const nextDetails = normalizeContactDetails(document.contactSection?.details, fallbackEmail, stats);
      const nextClinics = normalizeClinics(document.contactSection?.clinics, stats);
      const nextBlocks = normalizeBlocks(document.pageBlocks, fallbackEmail, stats);

      const payload = {
        contactSection: {
          ...document.contactSection,
          details: nextDetails,
          clinics: nextClinics,
        },
        pageBlocks: nextBlocks,
      };

      if (!args.dryRun) {
        await app.documents('api::page.page').update({
          documentId: args.documentId,
          locale,
          status: 'draft',
          data: payload,
        });

        if (report.locales[locale].published) {
          await app.documents('api::page.page').publish({
            documentId: args.documentId,
            locale,
          });
        }
      }

      report.locales[locale] = {
        title: document.title,
        slug: document.slug,
        published: report.locales[locale].published,
        fallbackEmail,
        detailsCount: nextDetails.length,
        clinicsCount: nextClinics.length,
        pageBlocksCount: nextBlocks.length,
        stats,
      };
    }
  } finally {
    await app.destroy();
  }

  await fs.mkdir(path.dirname(resultPath), { recursive: true });
  await fs.writeFile(resultPath, JSON.stringify(report, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[contact-cleanup] Fatal: ${message}`);
  process.exitCode = 1;
});
