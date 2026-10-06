import { parseArgs } from "node:util";
import { createRunner } from "@srvm/core";
import { confirmReset } from "./confirm.js";
import { printHelp } from "./help.js";
import { loadConfig } from "./load-config.js";

const COMMANDS = new Set(["up", "down", "reset", "reload", "help"]);

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  let command: string | undefined;
  let configScript: string | undefined;
  let to: string | undefined;
  let help = false;

  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        "config-script": { type: "string" },
        to: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
    command = parsed.positionals[0];
    configScript = parsed.values["config-script"];
    to = parsed.values.to;
    help = parsed.values.help === true;

    if (parsed.positionals.length > 1) {
      throw new Error(`Unexpected argument "${parsed.positionals[1]}"`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error();
    printHelp();
    return 1;
  }

  if (help || command === "help") {
    printHelp();
    return 0;
  }

  if (command === undefined) {
    printHelp();
    return 1;
  }

  if (!COMMANDS.has(command)) {
    console.error(`Unknown command "${command}"`);
    console.error();
    printHelp();
    return 1;
  }

  if (to !== undefined && command !== "down") {
    console.error("--to is only valid with down");
    return 1;
  }

  let step: number | undefined;
  if (to !== undefined) {
    if (!/^\d+$/.test(to)) {
      console.error(`--to must be a non-negative integer, received ${to}`);
      return 1;
    }
    step = Number(to);
  }

  const config = await loadConfig(configScript);
  const runner = createRunner(config);

  switch (command) {
    case "up":
      await runner.run();
      return 0;
    case "down":
      await runner.down(step);
      return 0;
    case "reset": {
      const approved = await confirmReset();
      if (!approved) {
        console.log("Reset cancelled.");
        return 0;
      }
      await runner.reset();
      return 0;
    }
    case "reload":
      await runner.reload();
      return 0;
    default:
      console.error(`Unknown command "${command}"`);
      console.error();
      printHelp();
      return 1;
  }
}
