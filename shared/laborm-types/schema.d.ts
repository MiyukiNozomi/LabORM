import { Token } from "./token";
import type { IDriver } from "./driver-base/databaseDriver";
import { JSPrimitiveType } from "./schemaRtti";

/** This file wont be built, please do not include actual implementations here */

export type ColumnType = "STRING" | "INT" | "FLOAT" | "RELATION";

export type ColumnInfo = {
  name: Token;
  type: ColumnType;

  nullable: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;

  defaultValue?: Token;

  /***
   * This field refers to non-runtime information on the column.
   * This is only used by the CLI and the generated client themselves.
   */
  interstrict: {
    ownerModelName: Token;
    columnTypeToken: Token;
    relationshipStatus?:
      | {
          type: "Array";
          modelName: string;
        }
      | {
          type: "Field";
          modelName: string;
          thisFieldName: Token;
          otherFieldName: Token;
        };
  };
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
