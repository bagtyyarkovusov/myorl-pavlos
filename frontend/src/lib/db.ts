import "server-only";

import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  pool = new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return pool;
}

export async function query(
  text: string,
  params?: unknown[],
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

export async function logSearchQuery(
  q: string,
  locale: string,
  resultCount: number,
  sessionId: string,
): Promise<void> {
  await query(
    `INSERT INTO search_query_log (query, locale, result_count, session_id)
     VALUES ($1, $2, $3, $4::uuid)`,
    [q, locale, resultCount, sessionId],
  );
}
