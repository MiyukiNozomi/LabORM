import Database from "better-sqlite3";
import { DriverOptionsOrErrors, IDriver } from "./../idriver";
import { maythraTypeToSQLite3 } from "./conv";
import { ColumnInfo, ModelInfo, SchemaFile } from "../../schema";
import { Token } from "../../lexer";
import path from "path";
import { RunOptions } from "../../..";

type SQLite3DriverOptions = { file: string };

export class SQLite3Driver implements IDriver {
  private db: Database.Database;

  constructor(payload: SQLite3DriverOptions) {
    this.db = new Database(payload.file);
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

  public async createTable(table: ModelInfo) {
    this.db.exec(`
        CREATE TABLE ${table.name.data} (
            ${table.columns
              .map((v) => this.columnInfoAsSQLiteDeclaration(v))
              .join(",\n")}
        ) 
    `);
  }

  public async addColumn(col: ColumnInfo) {
    this.db.exec(`
        ALTER TABLE ${
          col.ownerModelName.data
        } ADD COLUMN ${this.columnInfoAsSQLiteDeclaration(col)}`);
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

  private columnInfoAsSQLiteDeclaration(column: ColumnInfo) {
    let decl = `${column.name.data} ${maythraTypeToSQLite3(column.type)}`;
    if (column.primaryKey) decl += " PRIMARY KEY";
    if (!column.nullable) decl += " NOT NULL";
    if (column.autoIncrement && !column.primaryKey) decl += " AUTOINCREMENT";
    return decl;
  }

  public async close() {
    this.db.close();
  }

  public static validateOptions(
    options: Record<string, Token>
  ): DriverOptionsOrErrors<SQLite3DriverOptions> {
    if (
      typeof options["file"] !== "object" ||
      options["file"].type != "STRING"
    ) {
      return {
        errors: [
          "SQLite3 options should only contain a string field named 'file'.",
        ],
      };
    }
    return {
      errors: [],
      driverOptions: {
        file: path.join(RunOptions.OUTPUT_DIR, options["file"].data),
      },
    };
  }
}
