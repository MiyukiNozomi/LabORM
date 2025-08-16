import { ColumnInfo, ColumnType } from "../../schema";
import { CompoundQueryOption, QueryOperator, QueryOption } from "../idriver";

function operationToSQLite(op: QueryOperator) {
  switch (op) {
    case "EQUALS":
      return "=";
    case "NOT_EQUALS":
      return "!=";
    case "LESS":
      return "<";
    case "GREATER":
      return ">";
    case "LESS_EQUAL":
      return "<=";
    case "GREATER_EQUAL":
      return ">=";
    default:
      throw "Unimplemented QueryOperator: " + op;
  }
}

function queryOptionsToCondition(
  query: QueryOption | CompoundQueryOption,
  valuesList: Array<unknown>
): string {
  if ("left" in query) {
    const queryOption = query as CompoundQueryOption;
    return (
      queryOptionsToCondition(queryOption.left, valuesList) +
      ` ${queryOption.op} ` +
      queryOptionsToCondition(queryOption.right, valuesList)
    );
  } else {
    const queryOption = query as QueryOption;
    valuesList.push(queryOption.value);
    return `${queryOption.columnName} ${operationToSQLite(queryOption.op)} ?`;
  }
}

export function queryOptionsToWhereStmt(
  query: QueryOption | CompoundQueryOption | undefined,
  outValuesList: Array<unknown>
) {
  if (!query) return "";
  return `WHERE ${queryOptionsToCondition(query, outValuesList)};`;
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
