import { fileURLToPath } from "node:url";
import { defineConfig } from "@srvm/core";
import { defineStore } from "@srvm/store-sqlite";

export default defineConfig({
  scripts: fileURLToPath(new URL("./scripts", import.meta.url)),
  store: defineStore({
    adapter: "sqlite",
    connection: fileURLToPath(new URL("./srvm.sqlite", import.meta.url)),
  }),
});
