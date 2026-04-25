'use strict';

const fs = require('fs/promises');
const path = require('path');
const core = require('@strapi/core');

function parseArgs(argv) {
  const args = {
    batch: '',
    result: '',
    dryRun: false,
    sleepMs: 25,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--batch' && next) {
      args.batch = next;
      index += 1;
      continue;
    }
    if (arg === '--result' && next) {
      args.result = next;
      index += 1;
      continue;
    }
    if (arg === '--sleep-ms' && next) {
      args.sleepMs = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      args.dryRun = true;
    }
  }

  if (!args.batch) {
    throw new Error('--batch is required');
  }
  if (!args.result) {
    throw new Error('--result is required');
  }
  if (!Number.isFinite(args.sleepMs) || args.sleepMs < 0) {
    throw new Error('--sleep-ms must be a non-negative integer');
  }

  return args;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function mediaKey(media) {
  if (!media || typeof media !== 'object') {
    return null;
  }
  if (typeof media.documentId === 'string' && media.documentId) {
    return media.documentId;
  }
  if (typeof media.url === 'string' && media.url) {
    return media.url;
  }
  if (typeof media.id === 'number') {
    return String(media.id);
  }
  return null;
}

function findSection(pageSections, component) {
  return (pageSections || []).find((section) => section?.__component === component) || null;
}

function diffLists(expected, actual) {
  if (expected.length !== actual.length) {
    return `length mismatch expected=${expected.length} actual=${actual.length}`;
  }

  for (let index = 0; index < expected.length; index += 1) {
    const left = JSON.stringify(expected[index]);
    const right = JSON.stringify(actual[index]);
    if (left !== right) {
      return `item mismatch at index ${index}`;
    }
  }

  return null;
}

function compareAccordion(document) {
  const blocks = (document.pageBlocks || [])
    .filter((block) => block?.__component === 'blocks.accordion-item')
    .map((block) => ({
      title: normalizeText(block.title),
      content: normalizeText(block.content),
    }));
  const sectionItems = document.accordionSection?.items || [];
  const semantic = sectionItems.map((item) => ({
    title: normalizeText(item.title),
    content: normalizeText(item.content),
  }));
  return diffLists(blocks, semantic);
}

function compareFaq(document) {
  const blocks = (document.pageBlocks || [])
    .filter((block) => block?.__component === 'blocks.faq-item')
    .map((block) => ({
      question: normalizeText(block.question),
      answer: normalizeText(block.answer),
    }));
  const sectionItems = document.faqSection?.items || [];
  const semantic = sectionItems.map((item) => ({
    question: normalizeText(item.question),
    answer: normalizeText(item.answer),
  }));
  return diffLists(blocks, semantic);
}

function compareTabs(document) {
  const blocks = (document.pageBlocks || [])
    .filter((block) => block?.__component === 'blocks.tab-item')
    .map((block) => ({
      title: normalizeText(block.title),
      content: normalizeText(block.content),
      link: normalizeText(block.link),
    }));
  const sectionItems = document.tabsSection?.items || [];
  const semantic = sectionItems.map((item) => ({
    title: normalizeText(item.title),
    content: normalizeText(item.content),
    link: normalizeText(item.link),
  }));
  return diffLists(blocks, semantic);
}

function compareGallery(document) {
  const blocks = (document.pageBlocks || [])
    .filter((block) => block?.__component === 'blocks.gallery-image')
    .map((block) => ({
      caption: normalizeText(block.caption),
      image: mediaKey(block.image),
    }));
  const sectionItems = document.gallerySection?.items || [];
  const semantic = sectionItems.map((item) => ({
    caption: normalizeText(item.caption),
    image: mediaKey(item.image),
  }));
  return diffLists(blocks, semantic);
}

function compareContact(document) {
  const detailBlocks = (document.pageBlocks || [])
    .filter((block) => block?.__component === 'blocks.contact-detail')
    .map((block) => ({
      type: normalizeText(block.type),
      value: normalizeText(block.value),
    }));
  const clinicBlocks = (document.pageBlocks || [])
    .filter((block) => block?.__component === 'blocks.clinic')
    .map((block) => ({
      name: normalizeText(block.name),
      address: normalizeText(block.address),
      phone: normalizeText(block.phone),
      email: normalizeText(block.email),
      latitude: block.latitude == null ? null : String(block.latitude),
      longitude: block.longitude == null ? null : String(block.longitude),
    }));

  const details = (document.contactSection?.details || []).map((item) => ({
    type: normalizeText(item.type),
    value: normalizeText(item.value),
  }));
  const clinics = (document.contactSection?.clinics || []).map((item) => ({
    name: normalizeText(item.name),
    address: normalizeText(item.address),
    phone: normalizeText(item.phone),
    email: normalizeText(item.email),
    latitude: item.latitude == null ? null : String(item.latitude),
    longitude: item.longitude == null ? null : String(item.longitude),
  }));

  return diffLists(detailBlocks, details) || diffLists(clinicBlocks, clinics);
}

function compareHome(document) {
  const sections = document.pageSections || [];
  const promoSection = findSection(sections, 'sections.promo-slider');
  const linkedSection = findSection(sections, 'sections.linked-resources');
  const socialSection = findSection(sections, 'sections.social-links');
  const videoSection = findSection(sections, 'sections.video');
  const advantagesSection = findSection(sections, 'sections.advantages');

  const promoBlocks = (document.pageBlocks || [])
    .filter((block) => block?.__component === 'blocks.promo-slide')
    .map((block) => ({
      title: normalizeText(block.title),
      description: normalizeText(block.description),
      image: mediaKey(block.image),
    }));
  const promoItems = (promoSection?.slides || []).map((item) => ({
    title: normalizeText(item.title),
    description: normalizeText(item.description),
    image: mediaKey(item.image),
  }));

  const linkedBlocks = (document.pageBlocks || [])
    .filter((block) => block?.__component === 'blocks.faq-item')
    .map((block) => ({
      title: normalizeText(block.question),
      description: normalizeText(block.answer),
    }));
  const linkedItems = (linkedSection?.items || []).map((item) => ({
    title: normalizeText(item.title),
    description: normalizeText(item.description),
  }));

  const socialBlocks = (document.pageBlocks || [])
    .filter((block) => block?.__component === 'blocks.social-link')
    .map((block) => ({
      name: normalizeText(block.name),
      url: normalizeText(block.url),
    }));
  const socialItems = (socialSection?.links || []).map((item) => ({
    name: normalizeText(item.name),
    url: normalizeText(item.url),
  }));

  const videoBlocks = (document.pageBlocks || [])
    .filter((block) => block?.__component === 'blocks.video')
    .map((block) => ({
      title: normalizeText(block.title),
      videoMp4: mediaKey(block.videoMp4),
      videoWebm: mediaKey(block.videoWebm),
      thumbnail: mediaKey(block.thumbnail),
      videoTags: normalizeText(block.videoTags),
    }));
  const videoItems = (videoSection?.videos || []).map((item) => ({
    title: normalizeText(item.title),
    videoMp4: mediaKey(item.videoMp4),
    videoWebm: mediaKey(item.videoWebm),
    thumbnail: mediaKey(item.thumbnail),
    videoTags: normalizeText(item.videoTags),
  }));

  const advantageBlocks = (document.pageBlocks || [])
    .filter((block) => block?.__component === 'blocks.advantage')
    .map((block) => ({
      title: normalizeText(block.title),
      description: normalizeText(block.description),
      icon: normalizeText(block.icon),
    }));
  const advantageItems = (advantagesSection?.items || []).map((item) => ({
    title: normalizeText(item.title),
    description: normalizeText(item.description),
    icon: normalizeText(item.icon),
  }));

  return (
    diffLists(promoBlocks, promoItems) ||
    diffLists(linkedBlocks, linkedItems) ||
    diffLists(socialBlocks, socialItems) ||
    diffLists(videoBlocks, videoItems) ||
    diffLists(advantageBlocks, advantageItems)
  );
}

function compareDocument(document) {
  if (document.pageType === 'accordion') {
    return compareAccordion(document);
  }
  if (document.pageType === 'faq') {
    return compareFaq(document);
  }
  if (document.pageType === 'tabs') {
    return compareTabs(document);
  }
  if (document.pageType === 'gallery') {
    return compareGallery(document);
  }
  if (document.pageType === 'contact') {
    return compareContact(document);
  }
  if (document.pageType === 'home') {
    return compareHome(document);
  }
  return `unsupported pageType ${document.pageType}`;
}

async function fetchDocument(app, documentId, locale) {
  return app.documents('api::page.page').findOne({
    documentId,
    locale,
    status: 'draft',
    populate: {
      pageBlocks: {
        on: {
          'blocks.accordion-item': true,
          'blocks.advantage': true,
          'blocks.clinic': true,
          'blocks.contact-detail': true,
          'blocks.faq-item': true,
          'blocks.gallery-image': { populate: ['image'] },
          'blocks.promo-slide': { populate: ['image'] },
          'blocks.social-link': true,
          'blocks.tab-item': true,
          'blocks.video': { populate: ['videoMp4', 'videoWebm', 'thumbnail'] },
        },
      },
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
  const batchPath = path.resolve(args.batch);
  const resultPath = path.resolve(args.result);
  const batch = JSON.parse(await fs.readFile(batchPath, 'utf8'));
  const documents = batch.documents || [];

  const appContext = await core.compileStrapi();
  const app = await core.createStrapi(appContext).load();

  const ok = [];
  const skipped = [];
  const errors = [];

  try {
    for (const entry of documents) {
      for (const locale of Object.keys(entry.locales || {})) {
        try {
          const document = await fetchDocument(app, entry.documentId, locale);
          if (!document) {
            skipped.push({
              documentId: entry.documentId,
              locale,
              reason: 'document-not-found',
            });
            continue;
          }

          const mismatch = compareDocument(document);
          if (mismatch) {
            skipped.push({
              documentId: entry.documentId,
              locale,
              reason: mismatch,
            });
            continue;
          }

          if (!args.dryRun) {
            await app.documents('api::page.page').update({
              documentId: entry.documentId,
              locale,
              status: 'draft',
              data: {
                pageBlocks: [],
              },
            });

            if (await hasPublishedDocument(app, entry.documentId, locale)) {
              await app.documents('api::page.page').publish({
                documentId: entry.documentId,
                locale,
              });
            }
          }

          ok.push({
            documentId: entry.documentId,
            locale,
            pageType: document.pageType,
            dryRun: args.dryRun,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push({
            documentId: entry.documentId,
            locale,
            error: message,
          });
        }

        if (args.sleepMs > 0) {
          await sleep(args.sleepMs);
        }
      }
    }
  } finally {
    await app.destroy();
  }

  await fs.mkdir(path.dirname(resultPath), { recursive: true });
  await fs.writeFile(
    resultPath,
    JSON.stringify(
      {
        batch: batch.batch,
        dryRun: args.dryRun,
        okCount: ok.length,
        skippedCount: skipped.length,
        errorCount: errors.length,
        ok,
        skipped,
        errors,
      },
      null,
      2
    )
  );

  process.exitCode = errors.length > 0 ? 1 : 0;
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[pageblocks-cleanup] Fatal: ${message}`);
  process.exitCode = 1;
});
