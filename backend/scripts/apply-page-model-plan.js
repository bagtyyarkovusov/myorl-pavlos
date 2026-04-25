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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const planPath = path.resolve(args.plan);
  const resultPath = path.resolve(args.result);
  const plan = JSON.parse(await fs.readFile(planPath, 'utf8'));
  const plannedUpdates = plan.plannedUpdates || [];

  const appContext = await core.compileStrapi();
  const app = await core.createStrapi(appContext).load();

  const ok = [];
  const errors = [];

  try {
    for (let index = 0; index < plannedUpdates.length; index += 1) {
      const entry = plannedUpdates[index];
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
          documentId: entry.documentId,
          locale: entry.locale,
          changedKeys: Object.keys(entry.payload || {}).sort(),
          payload: entry.payload,
        });

        if ((index + 1) % 25 === 0 || index === plannedUpdates.length - 1) {
          console.log(
            `[page-plan] Applied ${index + 1}/${plannedUpdates.length} ${entry.documentId} ${entry.locale}`
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({
          documentId: entry.documentId,
          locale: entry.locale,
          error: message,
        });
        console.error(`[page-plan] Failed ${entry.documentId} ${entry.locale}: ${message}`);
      }

      if (args.sleepMs > 0) {
        await sleep(args.sleepMs);
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
  console.error(`[page-plan] Fatal: ${message}`);
  process.exitCode = 1;
});
