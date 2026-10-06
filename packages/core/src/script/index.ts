import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Script } from './types.js';
import type { Store } from '../store/index.js';

const SCRIPT_FILE = /\.(mjs|js|ts|mts)$/;

export type { Script };

export function defineScript(script: Script): Script {
  return script;
}

export async function loadScripts(basePath: string): Promise<Script[]> {
  const directory = resolve(basePath);
  const files = readdirSync(directory)
    .filter((file) => SCRIPT_FILE.test(file) && !file.endsWith('.d.ts'))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const scripts: Script[] = [];
  for (const file of files) {
    const moduleUrl = pathToFileURL(join(directory, file)).href;
    let scriptModule: Script;
    try {
      ({ default: scriptModule } = await import(moduleUrl));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load script "${file}": ${reason}`, { cause: error });
    }

    if (
      scriptModule == null ||
      typeof scriptModule.up !== 'function' ||
      typeof scriptModule.down !== 'function'
    ) {
      throw new Error(`Script "${file}" must default-export { meta, up, down }`);
    }

    scripts.push(scriptModule);
  }

  return scripts;
}

export async function runScript(script: Script, store: Store) {
  await store.execute(script);
}

export async function rollbackScript(script: Script, store: Store) {
  await store.rollback(script);
}
