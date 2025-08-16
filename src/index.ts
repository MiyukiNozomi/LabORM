import { existsSync, mkdirSync, readFileSync, statSync } from "fs";
import { SchemaParser } from "./lab/parser";
import { initializeSchemaFile } from "./lab/schema";
import { performMigrations } from "./lab/migrations";
import { installAndGenerateClient } from "./lab/generation";

export let RunOptions = {
  VERBOSE: false,
  FORCE_MIGRATION: false,
  FORCE_DRIVER_INSTALL: false,
  SCHEMA_FILE: "myschema.laborm",
  OUTPUT_DIR: "laborm",
};

function getEngineOrUndefined() {
  if (
    !existsSync(RunOptions.SCHEMA_FILE) ||
    !statSync(RunOptions.SCHEMA_FILE).isFile()
  ) {
    console.error(
      "'" + RunOptions.SCHEMA_FILE + "' does not exist or it isn't a file."
    );
    return undefined;
  }

  const rawSchema = new SchemaParser(
    RunOptions.SCHEMA_FILE,
    readFileSync(RunOptions.SCHEMA_FILE).toString()
  ).parse();

  if (!rawSchema) {
    console.error("Schema has failed to load.");
    return undefined;
  }

  const dbEngine = initializeSchemaFile(rawSchema);

  if (!dbEngine) {
    console.error("Problems were found in schema, operation cancelled.");
    return undefined;
  }

  return dbEngine;
}

async function performMigrate() {
  const engine = getEngineOrUndefined();
  if (!engine) return (process.exitCode = -1);

  if ((await performMigrations(engine)) != 0) {
    console.error("Migration failed.");
    return (process.exitCode = -2);
  }

  console.log("Successfully applied migrations!");
}

async function performGenerate() {
  const engine = getEngineOrUndefined();
  if (!engine) return (process.exitCode = -1);

  if ((await installAndGenerateClient(engine)) != 0) {
    console.error("Generate failed.");
    return (process.exitCode = -2);
  }
}

async function main() {
  let args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) continue;

    if (arg == "--verbose") RunOptions.VERBOSE = true;
    else if (arg == "--force-migrate") RunOptions.FORCE_MIGRATION = true;
    else if (arg == "--force-install") RunOptions.FORCE_DRIVER_INSTALL = true;
    else if (arg == "--schema") {
      const name = args[++i];
      if (!name) {
        return console.error(
          "Incorrect usage of --schema, example of correct usage: --schema [filename]"
        );
      }
      RunOptions.SCHEMA_FILE = name;
    } else if (arg == "--dst-folder") {
      const name = args[++i];
      if (!name) {
        return console.error(
          "Incorrect usage of --dst-folder, example of correct usage: --dst-folder [foldername]"
        );
      }
      RunOptions.OUTPUT_DIR = name;
    } else return console.error("Unknown argument: ", arg);
  }

  args = args.filter((v) => !v.startsWith("--"));
  const command = args[0];

  if (RunOptions.VERBOSE) {
    console.log("Command: ", command, " options: ", RunOptions);
  }

  if (!command) {
    return console.log(`
LabORM - A experimental ORM generator

Commands:
    laborm migrate    -    performs a migration
    laborm generate   -    generates your client, does not apply migrations
`);
  }

  mkdirSync(RunOptions.OUTPUT_DIR, { recursive: true });

  switch (command) {
    case "migrate": {
      return await performMigrate();
    }
    case "generate": {
      return await performGenerate();
    }
    default:
      process.exitCode = -1;
      return console.error("Unknown command: ", command);
  }
}

main().catch((err) => {
  console.error("Sorry, LabORM has encountered an internal exception: ");
  console.error(err);
  process.exitCode = 2;
});
