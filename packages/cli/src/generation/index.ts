import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { RunOptions } from "..";
import { JSPrimitiveType, SchemaFile } from "../../../../shared/laborm-types";
import path from "path";
import { genTypings } from "./typings";
import { GeneratorType, GeneratorTypes, ModelTypeGenerator } from "./modelType";

export async function generateClient(
  runOptions: RunOptions,
  schema: SchemaFile
) {
  if (!schema.engineOptions)
    throw new Error(
      "Error! tried to generate client with invalid schema somehow! this is a bug! report it!"
    );

  const clientFolder = path.resolve(runOptions.folder, "client");
  const driverFolder = path.resolve(clientFolder, "installed-driver");
  rmSync(clientFolder, { recursive: true, force: true });
  mkdirSync(driverFolder, {
    recursive: true,
  });

  copyWithReplacements(
    runOptions,

    path.resolve(
      __dirname,
      `../../database-drivers/${schema.engineOptions.name.data}`
    ),
    driverFolder,
    {}
  );
  console.log("Driver Installed!");

  copyWithReplacements(
    runOptions,
    path.resolve(__dirname, `../../client/`),
    clientFolder,
    {
      SchemaLoaded: "[]",
      DatabaseOptions: JSON.stringify(schema.engineOptions),
    }
  );

  console.log("Generic Client Installed!");

  await genTypings(clientFolder, schema);

  console.log("Client successful generated!");
}

function generateRuntimeTypes(schema: SchemaFile) {
  let typings: Record<string, any> = {};

  const noRefGenerator = new ModelTypeGenerator(
    schema,
    "NoRef"
  ).runtimeTypeMode();

  for (let genType of GeneratorTypes.filter((v) => v != "NoRef")) {
    const generator = new ModelTypeGenerator(schema, genType).runtimeTypeMode();
  }

  return typings as Record<GeneratorType, Record<string, JSPrimitiveType>>;
}

function copyWithReplacements(
  runOptions: RunOptions,
  folder: string,
  dst: string,
  replacements: Record<string, string>
) {
  const list = readdirSync(folder);

  const variableNames = Object.keys(replacements);

  for (let file of list) {
    const filePath = path.join(folder, file);
    const outFilePath = path.join(dst, file);

    if (statSync(filePath).isDirectory()) {
      if (runOptions.verbose)
        console.warn("WARN // Not copying: " + filePath + "(directory)");
      continue;
    }
    if (filePath.endsWith(".d.ts")) {
      if (runOptions.verbose)
        console.log("Skip", filePath, " (Unnecessary declaration)");
      continue;
    }
    if (runOptions.verbose)
      console.log("Transforming", filePath, "->", outFilePath);

    let content = readFileSync(filePath).toString();

    for (let key of variableNames) {
      content = content.replaceAll(`$` + key, replacements[key]);
    }

    writeFileSync(outFilePath, content);
  }
}
