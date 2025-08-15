import { RunOptions } from "..";
import { DriverOptionsOrErrors, IDriver } from "./drivers/idriver";
import SQLite3Driver from "./drivers/sqlite3";
import { SchemaLexer, Token, TokenType } from "./lexer";
import { writeErrorImpl } from "./tools";

export const SUPPORTED_DRIVERS = ["sqlite3"] as const;
export type DriverTypes = (typeof SUPPORTED_DRIVERS)[number];

export type ColumnType = "STRING" | "INT" | "FLOAT";

export type ColumnInfo = {
  name: Token;
  type: ColumnType;

  nullable: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;

  defaultValue?: Token;

  ownerModelName: Token;
};

export type ModelInfo = {
  name: Token;
  columns: ColumnInfo[];
};

export type SchemaEngineOptions = {
  name: Token;
  options: Record<string, Token>;
};

export type SchemaFile = {
  engineOptions?: SchemaEngineOptions;
  models: ModelInfo[];
};

export type NativeDatabase = {
  driver: IDriver;
  schema: SchemaFile;
};

function validateEngineOptionsAndGetErrors(
  engineOptions: SchemaEngineOptions
): DriverOptionsOrErrors<any> {
  if (RunOptions.VERBOSE) {
    console.log(
      "Validating options:",
      engineOptions.options,
      " for driver ",
      engineOptions.name.data
    );
  }

  switch (engineOptions.name.data as DriverTypes) {
    case "sqlite3":
      return SQLite3Driver.validateOptions(engineOptions.options);
    default:
      throw (
        "Engine validation for '" +
        engineOptions.name.data +
        "' was not implemented."
      );
  }
}

function createEngine(
  engineOptions: SchemaEngineOptions,
  validatedOptions: any
) {
  if (RunOptions.VERBOSE) {
    console.log("Instantiate: ", engineOptions.name.data);
  }
  switch (engineOptions.name.data as DriverTypes) {
    case "sqlite3":
      return new SQLite3Driver(validatedOptions);
    default:
      throw (
        "Engine factory for '" +
        engineOptions.name.data +
        "' was not implemented."
      );
  }
}

function areColumnAndDefaultValueIncompatible(
  columnInfo: ColumnInfo,
  defaultValue: Token
) {
  // fun fact, the entirety of ColumnType (as of 15/08/2025) fits into TokenType, which is funny.
  if (columnInfo.type != defaultValue.type) {
    writeErrorImpl(
      defaultValue,
      "Column",
      columnInfo.name.data,
      "from model",
      columnInfo.ownerModelName.data,
      "is defined as a",
      columnInfo.type,
      "but it's default value is of an incompatible type:",
      defaultValue.type
    );
    return true;
  }
  return false;
}

function isModelInvalid(schemaFile: SchemaFile, model: ModelInfo) {
  let hasPrimaryKey = false;
  let foundColumns = new Array<string>();

  for (let column of model.columns) {
    if (foundColumns.includes(column.name.data)) {
      writeErrorImpl(
        column.name,
        "Model",
        model.name.data,
        "has a duplicated column of name:",
        column.name.data
      );
      return true;
    }
    foundColumns.push(column.name.data);

    if (column.primaryKey) {
      if (hasPrimaryKey) {
        writeErrorImpl(
          model.name,
          "Model",
          model.name.data,
          "has two primary keys, this isn't allowed."
        );
        return true;
      }
      hasPrimaryKey = true;
    }

    if (column.autoIncrement) {
      if (column.defaultValue) {
        writeErrorImpl(
          column.name,
          "Column",
          column.name.data,
          "cannot have a default value and be 'autoincrement'"
        );
        return false;
      } else if (column.type != "INT") {
        writeErrorImpl(
          column.name,
          "Column",
          column.name.data,
          "cannot be non-integer and be 'autoincrement'"
        );
        return false;
      }
    }

    if (
      column.defaultValue &&
      areColumnAndDefaultValueIncompatible(column, column.defaultValue)
    ) {
      return true;
    }
  }

  if (!hasPrimaryKey) {
    writeErrorImpl(
      model.name,
      "Model",
      model.name.data,
      "is lacking a primary key, this isn't allowed."
    );
    return true;
  }
  return false;
}

export function initializeSchemaFile(
  schemaFile: SchemaFile
): NativeDatabase | null {
  if (RunOptions.VERBOSE) {
    console.log("Initializing schema: ", schemaFile);
  }

  // first off..
  if (!schemaFile.engineOptions) {
    console.error(
      "ERROR! FATAL! None of your schema files have the database engine configured, LabORM does not know what to do."
    );
    return null;
  }

  const { errors, driverOptions } = validateEngineOptionsAndGetErrors(
    schemaFile.engineOptions
  );
  if (errors.length > 0) {
    writeErrorImpl(
      schemaFile.engineOptions.name,
      `There's ${
        errors.length == 1 ? "a problem" : "a few problems"
      } with your engine options: \n${errors.join("\n")}`
    );
    return null;
  }

  // validate column declarations now
  let alreadyFoundModels = new Array<string>();

  for (let model of schemaFile.models) {
    if (alreadyFoundModels.includes(model.name.data)) {
      writeErrorImpl(
        model.name,
        "Duplicate model declaration:",
        model.name.data
      );
      return null;
    }
    alreadyFoundModels.push(model.name.data);

    if (isModelInvalid(schemaFile, model)) {
      return null;
    }
  }

  return {
    driver: createEngine(schemaFile.engineOptions, driverOptions),
    schema: schemaFile,
  };
}
