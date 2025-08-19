import type { ColumnInfo, ModelInfo, SchemaFile } from "./schema";

export type DriverOptionsOrErrors<T> = {
  errors: string[];
  driverOptions?: T;
};

/**
 * To contributors,
 *
 * Here's a few basic explanations here:
 * **YES**, all drivers must be asynchronous in nature.
 * This is due to the fact *some* database bind
 */
export interface IDriver {
  /*** tools */
  printSetupMessage(): Promise<void>;

  /*** Data management */

  insert(tableName: string, values: Record<string, any>): Promise<unknown>;

  /*** Schema Management */
  loadSchema(): Promise<SchemaFile | null>;
  storeSchema(thisSchema: SchemaFile): Promise<void>;

  createTable(thisSchema: SchemaFile, table: ModelInfo): Promise<void>;
  addColumn(thisSchema: SchemaFile, col: ColumnInfo): Promise<void>;
  updateColumn(thisSchema: SchemaFile, col: ColumnInfo): Promise<void>;

  dropColumn(thisSchema: SchemaFile, col: ColumnInfo): Promise<void>;

  dropTable(thisSchema: SchemaFile, table: ModelInfo): Promise<void>;

  /*** Other */
  close(): Promise<void>;
}
