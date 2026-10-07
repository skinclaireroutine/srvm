import { hash } from "node:crypto";
import pg from "pg";
import type { Script } from "@srvm/core";

export const DEFAULT_TABLE = "srvm_migrations";
export const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function resolveConnection(connection: string | undefined): string {
  if (connection === undefined || connection.trim() === "") {
    throw new Error("PostgreSQL connection must be a connection string");
  }

  return connection;
}

export function resolveTable(name: string | undefined): string {
  const table = name ?? DEFAULT_TABLE;
  if (!IDENTIFIER.test(table)) {
    throw new Error(
      `Invalid script migration table name "${table}". Use letters, numbers, and underscores, starting with a letter or underscore.`,
    );
  }

  return table;
}

export function quoteIdentifier(name: string): string {
  return `"${name}"`;
}

export function scriptName(script: Script): string {
  const name = script.meta?.name;
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Script meta.name is required");
  }

  return name;
}

export function scriptChecksum(script: Script): string {
  return hash(
    "sha256",
    JSON.stringify({
      name: script.meta.name,
      description: script.meta.description ?? null,
      up: script.up.toString(),
      down: script.down.toString(),
    }),
    "hex",
  );
}

export function openDatabase(connectionString: string): pg.Pool {
  return new pg.Pool({
    connectionString,
    max: 1,
    allowExitOnIdle: true,
  });
}

export function query<T extends pg.QueryResultRow>(
  db: pg.Pool | pg.PoolClient,
  sql: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return db.query<T>(sql, params);
}

export function rows<T extends pg.QueryResultRow>(result: pg.QueryResult<T>): T[] {
  return result.rows;
}

export function rowCount(result: pg.QueryResult): number {
  return result.rowCount ?? 0;
}

export async function transaction<T>(pool: pg.Pool, task: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await task(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original failure when the rollback itself fails.
    }

    throw error;
  } finally {
    client.release();
  }
}
