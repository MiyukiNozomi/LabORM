import z from "zod";
import { implMigrate } from "./commands/migrate";
import { implGenerate } from "./commands/generate";
import { implHelp } from "./commands/help";

type CommandHandler = (flags: RunOptions) => Promise<void> | void;

const commands: Record<string, CommandHandler> = {
  migrate: implMigrate,
  generate: implGenerate,
  help: implHelp,
};

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const rawFlags: Record<string, string | boolean> = {};

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        rawFlags[key] = next;
        i++;
      } else {
        rawFlags[key] = true;
      }
    }
  }

  return { command, rawFlags };
}

const ArgTypes = z.object({
  "schema-file": z.string().default("schema.labORM"),
  folder: z.string().default("./database"),

  "no-action": z.boolean().default(false),
  verbose: z.boolean().default(false),

  "output-json-schema-file": z.string().optional(),
});

export type RunOptions = z.infer<typeof ArgTypes>;

function validateArgs(flags: unknown) {
  const result = ArgTypes.safeParse(flags);
  if (result.error) {
    console.log(result.error);
    process.exit(-2);
  }

  return result.data!;
}

async function runCLI() {
  const { command, rawFlags } = parseArgs(process.argv.slice(2));

  if (!command) {
    return implHelp();
  }

  const handler = commands[command ?? "<clearly missing>"];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }

  const RunFlags = validateArgs(rawFlags);

  await handler(RunFlags);
}

runCLI().catch((err) => {
  console.log("Sorry! LabORM's CLI has crashed!");
  console.log("Message: ", err instanceof Error ? err.message : err);
  console.error("Error stack:", err instanceof Error ? err.stack : err);
});
