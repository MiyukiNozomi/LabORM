import Database from "better-sqlite3";
import { ISchemaDriver } from "../../../../shared/laborm-types/driver-base/schemaDriver";
import {
  ColumnInfo,
  ModelInfo,
  SchemaFile,
} from "../../../../shared/laborm-types";
import {
  columnInfoAsSQLiteDeclaration,
  columnTypeToSQLite3,
  nameRelation,
} from "./conv";

export class SQLite3SchemaDriver implements ISchemaDriver {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public async loadSchema(): Promise<SchemaFile | null> {
    if (
      this.db
        .prepare(
          `SELECT * 
    FROM sqlite_master 
    WHERE type='table' AND name='labORMKeyValue'`
        )
        .all().length == 0
    )
      return null;

    const json = this.db
      .prepare("SELECT data FROM labORMKeyValue WHERE key = 'schema'")
      .all()[0] as {
      data?: string;
    };

    if (!json || !json.data) return null;

    return JSON.parse(json.data) as SchemaFile;
  }

  public async storeSchema(thisSchema: SchemaFile) {
    this.db.exec(`CREATE TABLE IF NOT EXISTS labORMKeyValue (
          key TEXT PRIMARY KEY,
          data TEXT NOT NULL
        )`);

    this.db
      .prepare(
        `
        INSERT INTO labORMKeyValue (key, data)
        VALUES ('schema', ?)
        ON CONFLICT(key) DO UPDATE SET
          data = excluded.data
        `
      )
      .bind(JSON.stringify(thisSchema))
      .run();
  }

  public async createTable(thisSchema: SchemaFile, table: ModelInfo) {
    this.db.pragma("foreign_keys = ON");

    let stmt = table.columns
      .filter((v) => v.interstrict.relationshipStatus === undefined)
      .map((v) => columnInfoAsSQLiteDeclaration(v));

    let relationTables = new Array<string>();
    table.columns.forEach((column) => {
      const rl = this.createRelationIfNeeded(thisSchema, column);
      if (rl) relationTables.push(rl);
    });

    this.db.exec(`CREATE TABLE ${table.name.data}
          (
            ${stmt.join(",\n")}
          )`);

    relationTables.forEach((v) => this.db.exec(v));
  }

  public async addColumn(thisSchema: SchemaFile, col: ColumnInfo) {
    if (col.interstrict.relationshipStatus) {
      const rl = this.createRelationIfNeeded(thisSchema, col);
      /** Relational column? yeah, no shit. We're not generating it. */
      if (rl) this.db.exec(rl);
      return;
    }
    this.db.exec(`
            ALTER TABLE ${
              col.interstrict.ownerModelName.data
            } ADD COLUMN ${columnInfoAsSQLiteDeclaration(col)}`);
  }

  public async updateColumn(thisSchema: SchemaFile, col: ColumnInfo) {
    const transferColName = `${col.name.data}_tmp_migration`;
    this.db.exec(
      `ALTER TABLE ${col.interstrict.ownerModelName.data} RENAME COLUMN ${col.name.data} TO ${transferColName}`
    );

    this.addColumn(thisSchema, col);

    this.db.exec(
      `UPDATE ${col.interstrict.ownerModelName.data} set ${col.name.data} = ${transferColName}`
    );
  }

  public async dropColumn(thisSchema: SchemaFile, col: ColumnInfo) {
    if (col.interstrict.relationshipStatus) {
      this.dropRelationTableIfNeeded(thisSchema, col);
    } else {
      // the column only exists IF it's not a relation-specific column.
      this.db.exec(`
            ALTER TABLE ${col.interstrict.ownerModelName.data} DROP COLUMN ${col.name.data}
        `);
    }
  }

  public async dropTable(thisSchema: SchemaFile, table: ModelInfo) {
    table.columns.forEach((v) => this.dropRelationTableIfNeeded(thisSchema, v));
    this.db.exec(`
            DROP TABLE ${table.name.data} 
        `);
  }

  /*************
   * Utilities *
   *************/

  private dropRelationTableIfNeeded(thisSchema: SchemaFile, col: ColumnInfo) {
    if (
      !col.interstrict.relationshipStatus ||
      col.interstrict.relationshipStatus.type == "Array"
    )
      return; /** no action, because relational columns do not exist in pratice. */
    const referencedModel = thisSchema.models.find(
      (v) => v.name.data == col.interstrict.relationshipStatus!.modelName
    );
    if (!referencedModel)
      throw new Error(
        "Failed to drop: " +
          col.name.data +
          " relation model " +
          col.interstrict.relationshipStatus.modelName +
          " appears to have been dropped from the schema."
      );

    const tableName = nameRelation(
      col,
      col.interstrict.relationshipStatus.thisFieldName,
      referencedModel
    );
    this.db.exec(`DROP TABLE IF EXISTS ${tableName}`);
  }

  private createRelationIfNeeded(thisSchema: SchemaFile, column: ColumnInfo) {
    if (
      column.interstrict.relationshipStatus?.type != "Field" ||
      !column.interstrict.relationshipStatus
    )
      return undefined;

    const { modelName, otherFieldName, thisFieldName } =
      column.interstrict.relationshipStatus;

    const referencedModel = thisSchema.models.find(
      (v) => v.name.data == modelName
    );

    if (!referencedModel)
      throw new Error("Could not find " + modelName + " for some reason...");

    const referencedColumn = referencedModel.columns.find(
      (v) => v.name.data == otherFieldName.data
    );

    if (!referencedColumn)
      throw new Error(
        "Could not find " +
          modelName +
          "#" +
          otherFieldName +
          " for some reason..."
      );

    // yes, we have to handle this ourselves.
    return `CREATE TABLE IF NOT EXISTS ${nameRelation(
      column,
      thisFieldName,
      referencedModel
    )} (
            LabrelationId INTEGER PRIMARY KEY,
            ${thisFieldName.data} ${columnTypeToSQLite3(
      referencedColumn.type
    )} NOT NULL,
            ${otherFieldName.data} ${columnTypeToSQLite3(
      referencedColumn.type
    )} NOT NULL
        )`;
  }
}
