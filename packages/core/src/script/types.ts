export type Script = {
  meta: {
    name: string;
    description?: string;
  };
  up: () => Promise<void>;
  down: () => Promise<void>;
}
