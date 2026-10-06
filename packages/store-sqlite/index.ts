import sqlite from "sqlite3";
import {
  resolveConnection,
  resolveTable,
  quoteIdentifier,
  openDatabase,
  run,
  exec,
  all,
  get,
  transaction,
  scriptName,
  scriptChecksum,
} from "./utils.js";
import type { Store } from "@srvm/core";

export type SqliteStoreOptions = {
  adapter?: "sqlite";
  connection?: string;
  scriptMigrationTable?: string;
};

export function defineStore(options: SqliteStoreOptions = {}): Store {
  if (options.adapter !== undefined && options.adapter !== "sqlite") {
    throw new Error(`Unsupported adapter "${options.adapter}"`);
  }

  return createStore(options);
}

export function createStore(options: SqliteStoreOptions = {}): Store {
  const connection = resolveConnection(options.connection);
  const scriptMigrationTable = resolveTable(options.scriptMigrationTable);
  const table = quoteIdentifier(scriptMigrationTable);

  let database: sqlite.Database | undefined;
  let chain: Promise<void> = Promise.resolve();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = chain.then(task);
    chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function getDb(): Promise<sqlite.Database> {
    if (database) {
      return database;
    }

    database = await openDatabase(connection);
    return database;
  }

  return {
    adapter: "sqlite",
    connection,
    scriptMigrationTable,

    setup() {
      return enqueue(async () => {
        const db = await getDb();
        await exec(
          db,
          `CREATE TABLE IF NOT EXISTS ${table} (
            id INTEGER PRIMARY KEY,
            step INTEGER NOT NULL UNIQUE,
            script TEXT NOT NULL UNIQUE,
            script_checksum TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`,
        );
      });
    },

    getApplied() {
      return enqueue(async () => {
        const db = await getDb();
        return all<{ step: number; script: string }>(
          db,
          `SELECT step, script FROM ${table} ORDER BY step ASC`,
        );
      });
    },

    execute(script) {
      return enqueue(async () => {
        const db = await getDb();
        const name = scriptName(script);
        const checksum = scriptChecksum(script);

        const alreadyApplied = await transaction(db, async () => {
          const existing = await get<{ script_checksum: string }>(
            db,
            `SELECT script_checksum FROM ${table} WHERE script = ?`,
            [name],
          );

          if (!existing) {
            return false;
          }

          if (existing.script_checksum !== checksum) {
            throw new Error(
              `Checksum mismatch for applied script "${name}". The script changed after it was recorded.`,
            );
          }

          return true;
        });

        if (alreadyApplied) {
          return false;
        }

        await script.up();

        await run(
          db,
          `INSERT INTO ${table} (step, script, script_checksum)
           VALUES ((SELECT COALESCE(MAX(step), 0) + 1 FROM ${table}), ?, ?)`,
          [name, checksum],
        );
        return true;
      });
    },

    rollback(script) {
      return enqueue(async () => {
        const db = await getDb();
        const name = scriptName(script);
        const existing = await get<{ script: string }>(
          db,
          `SELECT script FROM ${table} WHERE script = ?`,
          [name],
        );
        if (!existing) {
          return;
        }

        await script.down();
        const result = await run(db, `DELETE FROM ${table} WHERE script = ?`, [name]);
        if (result.changes === 0) {
          throw new Error(`Script "${name}" is not applied`);
        }
      });
    },

    rollbackAll() {
      return enqueue(async () => {
        const db = await getDb();
        await run(db, `DELETE FROM ${table}`);
      });
    },

    rollbackTo(step) {
      return enqueue(async () => {
        if (!Number.isInteger(step) || step < 0) {
          throw new Error(`Rollback step must be a non-negative integer, received ${String(step)}`);
        }

        const db = await getDb();
        await run(db, `DELETE FROM ${table} WHERE step > ?`, [step]);
      });
    },

    rollbackToLast() {
      return enqueue(async () => {
        const db = await getDb();
        const removed = await transaction(db, async () => {
          const latest = await get<{ step: number | null }>(db, `SELECT MAX(step) AS step FROM ${table}`);
          if (latest?.step == null) {
            return false;
          }

          await run(db, `DELETE FROM ${table} WHERE step = ?`, [latest.step]);
          return true;
        });

        if (!removed) {
          throw new Error("No applied scripts to roll back");
        }
      });
    },
  };
}
