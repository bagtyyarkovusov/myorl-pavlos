import type { Core } from "@strapi/strapi";
import { Client } from "pg";

const MIGRATION_NAME = "5.0.0-rename-identifiers-longer-than-max-length";

export async function suppressIndexRenames(strapi: Core.Strapi): Promise<void> {
  const client = strapi.config.get<string>("database.connection.client");
  if (client !== "postgres") return;

  const connection = strapi.config.get<Record<string, unknown>>(
    "database.connection.connection",
  );
  if (!connection) return;

  const connectionString =
    typeof connection.connectionString === "string"
      ? connection.connectionString
      : null;

  const user =
    typeof connection.user === "string" ? connection.user : null;
  const password =
    typeof connection.password === "string" ? connection.password : null;
  const host =
    typeof connection.host === "string" ? connection.host : "localhost";
  const port =
    typeof connection.port === "number" ? connection.port : 5432;
  const database =
    typeof connection.database === "string" ? connection.database : "strapi";

  const url =
    connectionString ??
    `postgresql://${user}:${password}@${host}:${port}/${database}`;

  const schema: string =
    typeof connection.schema === "string" ? connection.schema : "public";

  const pgClient = new Client({ connectionString: url });

  try {
    await pgClient.connect();

    const schemaQuery = schema === "public" ? "public" : `"${schema}"`;

    const { rows: tableExists } = await pgClient.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schemaQuery}'
        AND table_name = 'strapi_migrations_internal'
      )`,
    );

    if (!tableExists[0]?.exists) {
      strapi.log.info(
        "[suppress-index-renames] strapi_migrations_internal table does not exist yet — skipping",
      );
      return;
    }

    const { rows: existing } = await pgClient.query(
      "SELECT id FROM strapi_migrations_internal WHERE name = $1",
      [MIGRATION_NAME],
    );

    if (existing.length > 0) {
      strapi.log.info(
        "[suppress-index-renames] Migration already logged — skipping",
      );
      return;
    }

    await pgClient.query(
      "INSERT INTO strapi_migrations_internal (name, time) VALUES ($1, NOW())",
      [MIGRATION_NAME],
    );

    strapi.log.info(
      `[suppress-index-renames] Marked migration '${MIGRATION_NAME}' as done`,
    );
  } catch (err) {
    strapi.log.error(
      "[suppress-index-renames] Failed to suppress index renames",
      err,
    );
  } finally {
    await pgClient.end().catch(() => {});
  }
}
