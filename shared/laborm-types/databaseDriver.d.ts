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

  createTable(table: ModelInfo): Promise<void>;
  addColumn(col: ColumnInfo): Promise<void>;
  updateColumn(col: ColumnInfo): Promise<void>;

  dropColumn(col: ColumnInfo): Promise<void>;

  dropTable(tableName: string): Promise<void>;

  /*** Other */
  close(): Promise<void>;
}
