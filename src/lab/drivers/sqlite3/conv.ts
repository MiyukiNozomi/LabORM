import { ColumnInfo, ColumnType } from "../../schema";
import { UntypedQuery } from "../../generic/types";

// uhhh.. this feels kind of problematic? i mean this query format sucks but this is just beyond bad.
// I'll reconsider trying to mimic prisma, this isn't worth it, it's more complicated to generate queries
// for than I originally intended.

// for now it will work but in the worst way possible, it's too limited and too much of a mess.
// TODO: consider a more flexible way of doing queries
function untypedQueryToStmt(
  query: UntypedQuery,
  valuesList: Array<unknown>,
  defaultJoiner = "AND"
): string {
  if (query.OR) {
    return untypedQueryToStmt(query.AND, valuesList, "OR");
  } else {
    const keys = Object.keys(query);

    let checks = new Array();
    for (let key of keys) {
      checks.push(`${key} = ?`);
      valuesList.push((query as any)[key]);
    }

    return checks.join(` ${defaultJoiner} `);
  }
}

export function queryOptionsToWhereStmt(
  query: UntypedQuery | undefined,
  outValuesList: Array<unknown>
) {
  if (!query) return "";
  return `WHERE ${untypedQueryToStmt(query, outValuesList)};`;
}

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
