import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { SrvmConfig } from "@srvm/core";

export const DEFAULT_CONFIG_SCRIPT = "./srvm.config.js";

export async function loadConfig(configScript?: string): Promise<SrvmConfig> {
  const path = resolve(configScript ?? DEFAULT_CONFIG_SCRIPT);

  try {
    await access(path);
  } catch {
    throw new Error(`Config script not found: ${path}`);
  }

  let imported: { default?: unknown };
  try {
    imported = await import(pathToFileURL(path).href);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load config script "${path}": ${reason}`, { cause: error });
  }

  const config = imported.default;
  if (!isConfig(config)) {
    throw new Error(`Config script "${path}" must default-export the result of defineConfig`);
  }

  return config;
}

function isConfig(value: unknown): value is SrvmConfig {
  if (value == null || typeof value !== "object") {
    return false;
  }

  const config = value as { scripts?: unknown; store?: unknown };
  return typeof config.scripts === "string" && config.store != null && typeof config.store === "object";
}
