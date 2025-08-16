import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import {
  ColumnType,
  ModelInfo,
  NativeDatabase,
  SchemaEngineOptions,
} from "./schema";
import path from "path";
import { RunOptions } from "..";
import { removeAllFiles } from "./tools";
import { ModelSchemaTyping } from "./generic/model";

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

function localScriptFileLoad(filename: string) {
  const SkipComment = "/*** @laborm-skip-to-here */";

  const fileSource = readFileSync(path.join(__dirname, filename)).toString();
  const ii = fileSource.indexOf(SkipComment);

  return ii == -1 ? fileSource : fileSource.substring(ii + SkipComment.length);
}

function columnTypeToJS(type: ColumnType) {
  switch (type) {
    case "FLOAT":
    case "INT":
      return "number";
    case "STRING":
      return "string";
    default:
      throw "Type not implemented in generation.ts: " + type;
  }
}

function generateTypescriptTypeDeclaration(model: ModelInfo) {
  return `export type ${model.name.data} = {
    ${model.columns
      .map((v) => `${v.name.data} : ${columnTypeToJS(v.type)};`)
      .join("\n\t")}
}`;
}

function generateModelObject(model: ModelInfo) {
  let modelClass = localScriptFileLoad("generic/model.js");

  let className = `${model.name.data}LabImpl`;

  modelClass = modelClass.replace(`ModelClientImpl`, className);

  let columnsTyping: Record<string, string> = {};
  model.columns.forEach(
    (v) => (columnsTyping[v.name.data] = columnTypeToJS(v.type))
  );

  modelClass = modelClass.replace(
    `$ModelSchemaDecl`,
    JSON.stringify({
      name: model.name.data,
      columns: columnsTyping,
    } satisfies ModelSchemaTyping)
  );

  return {
    source: modelClass,
    className,
  };
}
function generateAndInstallGenericClient(engine: NativeDatabase) {
  let labORMClass = localScriptFileLoad("generic/client.js");

  labORMClass = labORMClass.replace(
    "$engineDecl",
    `(require("./driver/index.js"))(${JSON.stringify(engine.driverOptions)});`
  );

  let fieldList = new Array<{
    name: string;
    type: string;
    columnType: string;
    columnTypeName: string;
  }>();

  let initList = engine.schema.models.map((v) => {
    const mdl = generateModelObject(v);

    labORMClass = mdl.source + `\n` + labORMClass;

    const fieldName = v.name.data[0]!.toLowerCase() + v.name.data.substring(1);
    fieldList.push({
      name: fieldName,
      type: mdl.className,
      columnType: generateTypescriptTypeDeclaration(v),
      columnTypeName: v.name.data,
    });

    return `this.${fieldName} = new ${mdl.className}(this);`;
  });

  labORMClass = labORMClass.replace(
    `//@lab-generate-listing-here`,
    initList.join(";\n\t\t") + ";"
  );

  labORMClass = labORMClass.replace(
    `/*** @lab-generate-listing-here */`,
    fieldList.map((v) => v.name).join("\n\t")
  );

  writeFileSync(path.join(RunOptions.OUTPUT_DIR, "laborm.js"), labORMClass);

  /***********************
   *  Typescript Typings *
   ***********************/

  let modelTyping =
    fieldList.map((v) => v.columnType).join("\n\n") +
    "\n" +
    localScriptFileLoad("generic/model.d.ts") +
    "\n" +
    fieldList
      .map(
        (v) => `export type ${v.type} = ModelClientImpl<${v.columnTypeName}>`
      )
      .join("\n");

  let labORMClassTypings = readFileSync(
    path.join(__dirname, "generic/client.d.ts")
  ).toString();

  labORMClassTypings = labORMClassTypings.replace(
    `/*** @lab-generate-listing-here */`,
    fieldList.map((v) => `${v.name} : ${v.type};`).join("\n\t")
  );

  writeFileSync(
    path.join(RunOptions.OUTPUT_DIR, "laborm.d.ts"),
    modelTyping + "\n" + labORMClassTypings
  );
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
