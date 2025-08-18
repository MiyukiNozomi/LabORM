import { Token } from "./token";
import type { IDriver } from "./databaseDriver";

/** This file wont be built, please do not include actual implementations here */

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
  /***
   * This should always hold a safe version of data for whatever driver is chosen.
   * don't worry about validation, the CLI should already do this.
   */
  driverOptions: unknown;
  schema: SchemaFile;
};
