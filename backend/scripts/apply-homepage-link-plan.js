'use strict';

const fs = require('fs/promises');
const path = require('path');
const core = require('@strapi/core');

function parseArgs(argv) {
  const args = {
    plan: '',
    result: '',
    sleepMs: 50,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--plan' && next) {
      args.plan = next;
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
  }

  if (!args.plan) {
    throw new Error('--plan is required');
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

async function applyHomepageUpdates(app, updates, sleepMs, ok, errors) {
  for (let index = 0; index < updates.length; index += 1) {
    const entry = updates[index];
    try {
      await app.documents('api::page.page').update({
        documentId: entry.documentId,
        locale: entry.locale,
        status: 'draft',
        data: entry.payload,
      });

      if (entry.hasPublished) {
        await app.documents('api::page.page').publish({
          documentId: entry.documentId,
          locale: entry.locale,
        });
      }

      ok.push({
        kind: 'homepage',
        documentId: entry.documentId,
        locale: entry.locale,
      });

      console.log(
        `[homepage-links] Applied home ${index + 1}/${updates.length} ${entry.documentId} ${entry.locale}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({
        kind: 'homepage',
        documentId: entry.documentId,
        locale: entry.locale,
        error: message,
      });
      console.error(`[homepage-links] Failed home ${entry.documentId} ${entry.locale}: ${message}`);
    }

    if (sleepMs > 0) {
      await sleep(sleepMs);
    }
  }
}

async function applySlugUpdates(app, updates, sleepMs, ok, errors) {
  for (let index = 0; index < updates.length; index += 1) {
    const entry = updates[index];
    try {
      await app.documents('api::page.page').update({
        documentId: entry.documentId,
        locale: entry.locale,
        status: 'draft',
        data: {
          slug: entry.slug,
        },
      });

      if (entry.hasPublished) {
        await app.documents('api::page.page').publish({
          documentId: entry.documentId,
          locale: entry.locale,
        });
      }

      ok.push({
        kind: 'slug',
        documentId: entry.documentId,
        locale: entry.locale,
        slug: entry.slug,
      });

      console.log(
        `[homepage-links] Applied slug ${index + 1}/${updates.length} ${entry.documentId} ${entry.locale} -> ${entry.slug}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({
        kind: 'slug',
        documentId: entry.documentId,
        locale: entry.locale,
        slug: entry.slug,
        error: message,
      });
      console.error(
        `[homepage-links] Failed slug ${entry.documentId} ${entry.locale} -> ${entry.slug}: ${message}`
      );
    }

    if (sleepMs > 0) {
      await sleep(sleepMs);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const planPath = path.resolve(args.plan);
  const resultPath = path.resolve(args.result);
  const plan = JSON.parse(await fs.readFile(planPath, 'utf8'));
  const homepageUpdates = plan.plannedHomepageUpdates || [];
  const slugUpdates = plan.plannedSlugUpdates || [];

  const appContext = await core.compileStrapi();
  const app = await core.createStrapi(appContext).load();

  const ok = [];
  const errors = [];

  try {
    await applyHomepageUpdates(app, homepageUpdates, args.sleepMs, ok, errors);
    await applySlugUpdates(app, slugUpdates, args.sleepMs, ok, errors);
  } finally {
    await app.destroy();
  }

  await fs.mkdir(path.dirname(resultPath), { recursive: true });
  await fs.writeFile(
    resultPath,
    JSON.stringify(
      {
        okCount: ok.length,
        errorCount: errors.length,
        ok,
        errors,
      },
      null,
      2
    )
  );

  process.exitCode = errors.length > 0 ? 1 : 0;
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[homepage-links] Fatal: ${message}`);
  process.exitCode = 1;
});
