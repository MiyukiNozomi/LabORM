import {
  ColumnInfo,
  ColumnType,
  ModelInfo,
  Token,
} from "../../../../shared/laborm-types";

export function columnTypeToSQLite3(type: ColumnType) {
  switch (type) {
    case "FLOAT":
      return "REAL";
    case "INT":
      return "INTEGER";
    case "STRING":
      return "TEXT";
    default:
      throw new Error("Type " + type + " not implemented in SQLite3 driver!");
  }
}

export function nameRelation(
  column: ColumnInfo,
  thisFieldName: Token,
  referencedModel: ModelInfo
) {
  return `Lab${column.interstrict.ownerModelName.data}F${thisFieldName.data}To${referencedModel.name.data}Relation`;
}

export function columnInfoAsSQLiteDeclaration(column: ColumnInfo) {
  let decl = `${column.name.data} ${columnTypeToSQLite3(column.type)}`;
  if (column.primaryKey) decl += " PRIMARY KEY";
  if (!column.nullable) decl += " NOT NULL";
  if (column.autoIncrement && !column.primaryKey) decl += " AUTOINCREMENT";
  return decl;
}
