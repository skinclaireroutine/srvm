import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@srvm/core";
import { defineStore } from "@srvm/store-postgres";

const envPath = fileURLToPath(new URL("./.env", import.meta.url));
try {
  loadEnvFile(envPath);
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
    throw error;
  }
}

const connection = process.env.DATABASE_URL;
if (!connection) {
  throw new Error(`Set DATABASE_URL in ${envPath}`);
}

export default defineConfig({
  scripts: fileURLToPath(new URL("./scripts", import.meta.url)),
  store: defineStore({
    connection,
  }),
});
