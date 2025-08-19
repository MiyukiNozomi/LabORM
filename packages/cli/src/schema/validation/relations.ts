import {
  ColumnInfo,
  ModelInfo,
  SchemaFile,
} from "../../../../../shared/laborm-types";
import { writeErrorImpl } from "../lexer";

export function validateRelations(schemaFile: SchemaFile) {
  for (let currentModel of schemaFile.models) {
    for (let currentColumn of currentModel.columns) {
      const { relationshipStatus, columnTypeToken } = currentColumn.interstrict;

      if (!relationshipStatus && currentColumn.type == "RELATION") {
        writeErrorImpl(
          columnTypeToken,
          "Unknown or unrecognized column type",
          columnTypeToken.data
        );
        return false;
      } else if (!relationshipStatus) continue;

      const referencedModel = schemaFile.models.find(
        (v) =>
          v.name.data.toLowerCase() ==
          relationshipStatus.modelName.toLowerCase()
      );
      if (!referencedModel) {
        writeErrorImpl(
          currentColumn.interstrict.columnTypeToken,
          `Referenced model of name '${relationshipStatus.modelName}' does not exist!`
        );
        return false;
      }

      if (
        !validateColumnRelation(
          schemaFile,
          currentColumn,
          currentModel,
          referencedModel
        )
      )
        return false;
    }
  }
  return true;
}

function validateColumnRelation(
  schemaFile: SchemaFile,
  currentColumn: ColumnInfo,
  currentModel: ModelInfo,
  referencedModel: ModelInfo
): boolean {
  const relationshipStatus = currentColumn.interstrict.relationshipStatus!;
  const columnTypeToken = currentColumn.interstrict.columnTypeToken;

  // first off, ensure the referencedModel actually refers back to this model in some way.
  // of course this cannot be a 1-1 relation *because i never needed this kind of relation in the first place...

  const referencesToThis = referencedModel.columns.filter(
    (v) =>
      v.interstrict.relationshipStatus &&
      v.interstrict.relationshipStatus.modelName.toLowerCase() ==
        currentColumn.interstrict.ownerModelName.data.toLowerCase()
  );

  if (referencesToThis.length == 0) {
    writeErrorImpl(
      columnTypeToken,
      `Model '${columnTypeToken.data}' does not have any relation to this model (Relational database! if side A talks to B, B has to talk back to A!).`
    );
    return false;
  }

  for (let reference of referencesToThis) {
    if (
      reference.interstrict.relationshipStatus!.type == relationshipStatus.type
    ) {
      writeErrorImpl(
        columnTypeToken,
        `LabORM does not support 1:1 relationships yet, only 1:n relations, sorry!`
      );
      console.error(
        "\t\tNote: you made a" +
          `${reference.interstrict.relationshipStatus!.type}:${
            relationshipStatus.type
          } relation, this is why.`
      );
      return false;
    }
  }

  if (relationshipStatus.type == "Array") {
    return true; //
  }

  if (
    !referencedModel.columns.find(
      (v) => v.name.data == relationshipStatus.otherFieldName.data
    )
  ) {
    writeErrorImpl(
      relationshipStatus.otherFieldName,
      "Model",
      referencedModel.name.data,
      "does not contain a field named",
      `'${relationshipStatus.otherFieldName.data}'`
    );
    return false;
  }

  if (
    currentModel.columns.find(
      (v) => v.name.data == relationshipStatus.thisFieldName.data
    )
  ) {
    writeErrorImpl(
      relationshipStatus.thisFieldName,
      "You don't have to declare the local field that will reference that model, please remove your field named",
      `'${relationshipStatus.thisFieldName.data}'`
    );
    return false;
  }

  return true;
}
