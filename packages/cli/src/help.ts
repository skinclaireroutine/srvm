export const HELP = `Usage: srvm <command> [options]

Commands:
  up       Apply pending scripts in filename order
  down     Roll back the latest applied step
  reset    Delete every migration row without running scripts
  reload   Clear the migration table, then apply every script
  help     Show this help

Options:
  --config-script <path>  Config file to load (default: examples/basic/index.js)
  --to <step>             With down, roll back every step above this number
  -h, --help              Show this help

Examples:
  srvm up
  srvm down
  srvm down --to=1
  srvm up --config-script ./other-config.js
  srvm reset
  srvm reload
`;

export function printHelp(): void {
  process.stdout.write(HELP);
}
