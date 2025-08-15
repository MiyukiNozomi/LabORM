import { ColumnType } from "../../schema";

export function maythraTypeToSQLite3(type: ColumnType) {
  switch (type) {
    case "FLOAT":
      return "REAL";
    case "INT":
      return "INTEGER";
    case "STRING":
      return "TEXT";
    default:
      throw "Type " + type + " not implemented in SQLite3 driver!";
  }
}
