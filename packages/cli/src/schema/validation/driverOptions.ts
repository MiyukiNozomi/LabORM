import path from "path";
import { SchemaFile } from "../../../../../shared/laborm-types";
import { writeErrorImpl } from "../lexer";
import { RunOptions } from "../..";

export function validateDriverOptionsOrExplode(
  runOptions: RunOptions,
  { engineOptions }: SchemaFile
) {
  if (!engineOptions)
    throw new Error("Bad schema file? somehow engineOptions == undefined.");

  switch (engineOptions.name.data) {
    case "sqlite3": {
      const fileToken = engineOptions.options["file"];
      if (fileToken === undefined || fileToken.type != "STRING") {
        writeErrorImpl(
          fileToken ?? engineOptions.name,
          "SQLite3 options only accept a 'file' parameter of type String, example `file: \"test.db\"`"
        );
        process.exit(-1);
      }
      return {
        file: path.join(runOptions.folder, fileToken!.data),
      };
    }
    default:
      process.exit(-1);
      return {}; // just so typescript shuts the hell up
  }
}
