import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

export async function confirmReset(): Promise<boolean> {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await readline.question("Reset the migration table? [y/N] ")).trim();
    return answer === "y" || answer === "Y";
  } finally {
    readline.close();
  }
}
