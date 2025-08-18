import Database from "better-sqlite3";
import {
  ColumnInfo,
  ModelInfo,
  SchemaFile,
  IDriver,
} from "../../../../shared/laborm-types";
import { columnInfoAsSQLiteDeclaration } from "./conv";

/**
 * Every driver should contain this function, no matter what.
 */
export default function init(options: { file: string }): SQLiteDriver {
  return new SQLiteDriver(options.file);
}

class SQLiteDriver implements IDriver {
  private db: Database.Database;

  constructor(file: string) {
    this.db = new Database(file);
  }

  /**************************
   *          Tools         *
   **************************/
  public async printSetupMessage(): Promise<void> {
    console.log(`
Welcome to LabORM/SQLite3!
This driver has a runtime dependency on @better-sqlite3.

Please install this module before using the LabORM generated client!
`);
  }

  /**************************
   *     Data Management    *
   **************************/

  public async insert(
    tableName: string,
    values: Record<string, any>
  ): Promise<unknown> {
    const valueKeys = Object.keys(values);
    const preparedStmt = this.db.prepare(
      `INSERT INTO ${tableName} (${valueKeys.join(",")})
       VALUES (${valueKeys.map((v) => "?").join(",")})
       RETURNING ${valueKeys.join(",")}`
    );

    preparedStmt.bind(...valueKeys.map((v) => values[v]));

    return preparedStmt.all();
  }

  /**************************
   *    Schema Management   *
   **************************/
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

  public async createTable(table: ModelInfo) {
    this.db.exec(`
        CREATE TABLE ${table.name.data} (
            ${table.columns
              .map((v) => columnInfoAsSQLiteDeclaration(v))
              .join(",\n")}
        ) 
    `);
  }

  public async addColumn(col: ColumnInfo) {
    this.db.exec(`
        ALTER TABLE ${
          col.ownerModelName.data
        } ADD COLUMN ${columnInfoAsSQLiteDeclaration(col)}`);
  }

  public async updateColumn(col: ColumnInfo) {
    const transferColName = `${col.name.data}_tmp_migration`;
    this.db.exec(
      `ALTER TABLE ${col.ownerModelName.data} RENAME COLUMN ${col.name.data} TO ${transferColName}`
    );

    this.addColumn(col);

    this.db.exec(
      `UPDATE ${col.ownerModelName.data} set ${col.name.data} = ${transferColName}`
    );
  }

  public async dropColumn(col: ColumnInfo) {
    this.db.exec(`
        ALTER TABLE ${col.ownerModelName.data} DROP COLUMN ${col.name.data}
    `);
  }

  public async dropTable(tableName: string) {
    this.db.exec(`
        DROP TABLE ${tableName} 
    `);
  }

  /**************************
   *          Other         *
   **************************/
  public async close() {
    this.db.close();
  }
}
