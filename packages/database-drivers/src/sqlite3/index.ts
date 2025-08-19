import Database from "better-sqlite3";
import {
  ColumnInfo,
  ModelInfo,
  SchemaFile,
  IDriver,
} from "../../../../shared/laborm-types";
import {
  columnInfoAsSQLiteDeclaration,
  columnTypeToSQLite3,
  nameRelation,
} from "./conv";
import { ISchemaDriver } from "../../../../shared/laborm-types/driver-base/schemaDriver";
import { SQLite3SchemaDriver } from "./schema";

/**
 * Every driver should contain this function, no matter what.
 */
export default function init(options: { file: string }): SQLiteDriver {
  return new SQLiteDriver(options.file);
}

class SQLiteDriver implements IDriver {
  private db: Database.Database;
  private schemaDriverImpl: SQLite3SchemaDriver;

  constructor(file: string) {
    this.db = new Database(file);
    this.schemaDriverImpl = new SQLite3SchemaDriver(this.db);
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
  public schemaDriver(): ISchemaDriver {
    return this.schemaDriverImpl;
  }

  /**************************
   *          Other         *
   **************************/
  public async close() {
    this.db.close();
  }
}
