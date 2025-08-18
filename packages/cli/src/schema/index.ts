import { existsSync, readFileSync, statSync } from "node:fs";
import { RunOptions } from "..";
import { SchemaParser } from "./parser";

export function getSchema(runOptions: RunOptions) {
  const filename = runOptions["schema-file"];
  if (!existsSync(filename) || !statSync(filename).isFile()) {
    console.error(
      filename +
        " does not exist, please create a schema file with this name, or verify your --schema-file parameter."
    );
    process.exit(-1);
  }
  const parser = new SchemaParser(filename, readFileSync(filename).toString());
  const schemaFile = parser.parse();

  if (parser.hadError) {
    console.error(filename + " has failed to load.");
    process.exit(-1);
  }

  if (!schemaFile!.engineOptions) {
    console.error(filename + " is lacking engine options, cannot proceed.");
    process.exit(-1);
  }

  return schemaFile!;
}
