import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { NativeDatabase, SchemaEngineOptions } from "./schema";
import path from "path";
import { RunOptions } from "..";
import { removeAllFiles } from "./tools";
import { Token } from "./lexer";

function installDriver(engine: SchemaEngineOptions) {
  const driverDstPath = path.join(RunOptions.OUTPUT_DIR, "driver");

  if (!existsSync(driverDstPath) || RunOptions.FORCE_DRIVER_INSTALL) {
    if (RunOptions.FORCE_DRIVER_INSTALL) {
      console.log("Deleting original driver install (--force-install enabled)");
      removeAllFiles(driverDstPath);
      console.log("Deletion complete.");
    }

    if (RunOptions.VERBOSE)
      console.log(
        "Installing " + engine.name.data + " driver into " + driverDstPath
      );

    cpSync(path.join(__dirname, "drivers/" + engine.name.data), driverDstPath, {
      recursive: true,
    });

    if (RunOptions.VERBOSE)
      console.log(
        "Driver " +
          engine.name.data +
          " successfully installed into " +
          driverDstPath +
          "!"
      );
  } else {
    console.log("Database driver not installed (directory already exists).");
    if (RunOptions.VERBOSE) {
      console.log(
        `Verbose note: This usually means you already have the database driver installed,
if you think it's corrupt by any reason you can force it to be copied over through --force-install`
      );
    }
  }
}

function generateModelObject() {}

function generateAndInstallGenericClient(engine: NativeDatabase) {
  let labORMClass = readFileSync(
    path.join(__dirname, "generic/client.js")
  ).toString();

  labORMClass = labORMClass.replace(
    "$engineDecl",
    `(require("./driver/index.js"))(${JSON.stringify(engine.driverOptions)});`
  );

  writeFileSync(path.join(RunOptions.OUTPUT_DIR, "laborm.js"), labORMClass);
}

export function installAndGenerateClient(engine: NativeDatabase) {
  if (!engine.schema.engineOptions) {
    console.error(
      "ERROR! Could not perform 'generate': Engine options is missing somehow in all of your schema files."
    );
    return -1;
  }
  installDriver(engine.schema.engineOptions);
  generateAndInstallGenericClient(engine);

  return 0;
}
