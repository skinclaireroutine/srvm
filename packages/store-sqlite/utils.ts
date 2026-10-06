import { hash } from "node:crypto";
import sqlite from "sqlite3";
import type { Script } from "@srvm/core";

export const DEFAULT_CONNECTION = ":memory:";
export const DEFAULT_TABLE = "srvm_migrations";
export const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const OPEN_MODE = sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE | sqlite.OPEN_URI;

export function resolveConnection(connection: string | undefined): string {
  if (connection === undefined) {
    return DEFAULT_CONNECTION;
  }

  if (connection.trim() === "") {
    throw new Error('SQLite connection must be a file path or ":memory:"');
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

export function openDatabase(filename: string): Promise<sqlite.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite.Database(filename, OPEN_MODE, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.configure("busyTimeout", 5000);
      resolve(db);
    });
  });
}

export function exec(db: sqlite.Database, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

export function run(db: sqlite.Database, sql: string, params: unknown[] = []): Promise<sqlite.RunResult> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: sqlite.RunResult, err: Error | null) {
      if (err) {
        reject(err);
        return;
      }

      resolve(this);
    });
  });
}

export function all<T>(db: sqlite.Database, sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: T[]) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows);
    });
  });
}

export function get<T>(db: sqlite.Database, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row?: T) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row);
    });
  });
}

export async function transaction<T>(db: sqlite.Database, task: () => Promise<T>): Promise<T> {
  await exec(db, "BEGIN IMMEDIATE");

  try {
    const result = await task();
    await exec(db, "COMMIT");
    return result;
  } catch (error) {
    try {
      await exec(db, "ROLLBACK");
    } catch {
      // Preserve the original failure when the rollback itself fails.
    }

    throw error;
  }
}
