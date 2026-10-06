import type { Store } from "../store/index.js";

export type SrvmConfig<TContext = any> = {
  context?: TContext;
  scripts: string;
  store: Store;
  onError?: (error: Error) => void;
};
