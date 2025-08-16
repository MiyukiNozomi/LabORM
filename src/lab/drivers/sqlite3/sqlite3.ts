import Database from "better-sqlite3";
import { DriverOptionsOrErrors, IDriver } from "./../idriver";
import { columnInfoAsSQLiteDeclaration, queryOptionsToWhereStmt } from "./conv";
import { ColumnInfo, ModelInfo, SchemaFile } from "../../schema";
import { Token } from "../../lexer";
import path from "path";
import { RunOptions } from "../../..";

export type SQLite3DriverOptions = { file: string };

export class SQLite3Driver implements IDriver {
  private db: Database.Database;

  constructor(payload: SQLite3DriverOptions) {
    this.db = new Database(payload.file);
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
  public async find(
    tableName: string,
    queryOptions: any | undefined
  ): Promise<Array<any>> {
    let valuesList = new Array<unknown>();
    const possibleQuery = queryOptionsToWhereStmt(queryOptions, valuesList);

    const preparedStmt = this.db.prepare(`
    SELECT
      *
    FROM ${tableName}
    ${possibleQuery}
    `);

    preparedStmt.bind(...valuesList);

    return preparedStmt.all();
  }

  public async update(
    tableName: string,
    values: Record<string, any>,
    queryOptions: any | undefined
  ): Promise<Array<any>> {
    const valueKeys = Object.keys(values);

    let queryValuesList = new Array<unknown>();
    const possibleQuery = queryOptionsToWhereStmt(
      queryOptions,
      queryValuesList
    );

    const preparedStmt = this.db.prepare(`
    UPDATE ${tableName}
    SET
      ${valueKeys.map((v) => `${v} = ?`)}
    ${possibleQuery}
    `);

    // I could do Object.values here too.. but i would rather do it this way to ensure they will have the same values as valueKeys.
    for (let i = 0; i < valueKeys.length; i++) {
      preparedStmt.bind(values[valueKeys[i]!]);
    }

    preparedStmt.bind(...queryValuesList);

    return preparedStmt.all();
  }

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
        file: path.resolve(
          path.join(RunOptions.OUTPUT_DIR, options["file"].data)
        ),
      },
    };
  }
}
