import { mkdirSync } from "fs";
import {
  IDriver,
  NativeDatabase,
  SchemaFile,
} from "../../../shared/laborm-types";
import { validateDriverOptionsOrExplode } from "./schema/validation/driverOptions";
import { RunOptions } from ".";

export async function loadDatabaseDriver(
  runOptions: RunOptions,
  schema: SchemaFile
): Promise<NativeDatabase> {
  if (!schema.engineOptions)
    throw new Error("EngineOptions is undefined here, this is illegal.");

  mkdirSync(runOptions.folder, {
    recursive: true,
  });

  const driverOptions = validateDriverOptionsOrExplode(runOptions, schema);

  // manually load
  const module = await import(
    `../database-drivers/${schema.engineOptions.name.data}/index.js`
  );

  const driver = module.default.default(driverOptions) as IDriver;

  return {
    driver,
    driverOptions,
    schema,
  };
}
