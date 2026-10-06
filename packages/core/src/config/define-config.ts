import type { SrvmConfig } from "./types.js";

export function defineConfig<TContext = unknown>(
  config: SrvmConfig<TContext>
): SrvmConfig<TContext> {
  return config;
}
