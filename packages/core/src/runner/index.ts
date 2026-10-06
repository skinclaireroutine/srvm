import type { SrvmConfig } from '../config/types.js';
import { loadScripts, rollbackScript, runScript } from '../script/index.js';

export type { RunnerConfig } from './types.js';

export function createRunner(config: SrvmConfig) {
  const onError = config.onError ?? ((error: Error) => {
    throw error;
  });

  async function run() {
    try {
      await config.store.setup();
      const scripts = await loadScripts(config.scripts);
      for (const script of scripts) {
        await runScript(script, config.store);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async function rollback() {
    try {
      await config.store.setup();
      const scripts = await loadScripts(config.scripts);
      for (const script of scripts.toReversed()) {
        await rollbackScript(script, config.store);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async function down(to?: number) {
    try {
      if (to !== undefined && (!Number.isInteger(to) || to < 0)) {
        throw new Error(`Rollback step must be a non-negative integer, received ${String(to)}`);
      }

      await config.store.setup();
      const scripts = await loadScripts(config.scripts);
      const applied = await config.store.getApplied();
      const targets = to === undefined ? applied.slice(-1) : applied.filter((row) => row.step > to);

      if (to === undefined && targets.length === 0) {
        throw new Error("No applied scripts to roll back");
      }

      const byName = new Map(scripts.map((script) => [script.meta.name, script]));
      for (const row of targets.toReversed()) {
        const script = byName.get(row.script);
        if (!script) {
          throw new Error(`Applied script "${row.script}" is not in the scripts directory`);
        }
        await rollbackScript(script, config.store);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async function reset() {
    try {
      await config.store.setup();
      await config.store.rollbackAll();
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async function reload() {
    await reset();
    await run();
  }

  return { run, rollback, down, reset, reload };
}
