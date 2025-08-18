import { ColumnInfo, ColumnType } from "../../../../shared/laborm-types";

export function columnTypeToSQLite3(type: ColumnType) {
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

export function columnInfoAsSQLiteDeclaration(column: ColumnInfo) {
  let decl = `${column.name.data} ${columnTypeToSQLite3(column.type)}`;
  if (column.primaryKey) decl += " PRIMARY KEY";
  if (!column.nullable) decl += " NOT NULL";
  if (column.autoIncrement && !column.primaryKey) decl += " AUTOINCREMENT";
  return decl;
}
