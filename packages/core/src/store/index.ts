import type { Script } from "../script/types.js";

export type Store = {
  adapter: string;
  connection?: string;
  scriptMigrationTable?: string;

  setup: () => Promise<void>;
  getApplied: () => Promise<Array<{ step: number; script: string }>>;
  execute: (script: Script) => Promise<boolean>;
  rollback: (script: Script) => Promise<void>;
  rollbackAll: () => Promise<void>;
  rollbackTo: (step: number) => Promise<void>;
  rollbackToLast: () => Promise<void>;
};
