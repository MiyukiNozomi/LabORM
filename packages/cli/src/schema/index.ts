import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { RunOptions } from "..";
import { SchemaParser } from "./parser";
import { validateRelations } from "./validation/relations";

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

  if (runOptions["output-json-schema-file"]) {
    const outFile = runOptions["output-json-schema-file"];
    console.log(
      "heeeyy~  you used the --output-json-schema-file argument! storing your schema (as JSON) to " +
        outFile
    );
    writeFileSync(outFile, JSON.stringify(schemaFile, null, 4));
  }

  if (parser.hadError || !schemaFile) {
    console.error(filename + " has failed to load.");
    return process.exit(-1);
  }

  if (!schemaFile.engineOptions) {
    console.error(filename + " is lacking engine options, cannot proceed.");
    return process.exit(-1);
  }

  if (!validateRelations(schemaFile)) {
    console.error(filename + " has relational errors, cannot proceed.");
    return process.exit(-1);
  }

  return schemaFile;
}
