import { ColumnInfo, ModelInfo, SchemaFile } from "../schema";

export interface ISchemaDriver {
  loadSchema(): Promise<SchemaFile | null>;
  storeSchema(thisSchema: SchemaFile): Promise<void>;

  createTable(thisSchema: SchemaFile, table: ModelInfo): Promise<void>;
  addColumn(thisSchema: SchemaFile, col: ColumnInfo): Promise<void>;
  updateColumn(thisSchema: SchemaFile, col: ColumnInfo): Promise<void>;

  dropColumn(thisSchema: SchemaFile, col: ColumnInfo): Promise<void>;

  dropTable(thisSchema: SchemaFile, table: ModelInfo): Promise<void>;
}
