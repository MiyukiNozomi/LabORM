import { RunOptions } from "..";
import { ColumnInfo, ModelInfo } from "../../../../shared/laborm-types";
import { writeErrorImpl } from "../schema/lexer";

export type FoundModelDifferences = {
  model: ModelInfo;

  columnsToBeAdded: ColumnInfo[];
  columnsToBeRemoved: ColumnInfo[];
  columnsToBeUpdated: ColumnInfo[];
};

export function ensureRelationStatusDidNotChange(
  thisColumn: ColumnInfo,
  existingColumn: ColumnInfo
) {
  const current = thisColumn.interstrict.relationshipStatus;
  const previous = existingColumn.interstrict.relationshipStatus;

  if (!current && !previous) return;
  if (
    (previous != undefined && current == undefined) ||
    (current != undefined && previous == undefined)
  ) {
    throw (
      "Please do not try to turn a non-relation into a relation!" +
      "this isn't supported, please remove your old field and add a new one if you want a new relation field!\n" +
      `Illegal relation change in: ${thisColumn.interstrict.ownerModelName.data}#${thisColumn.name.data}`
    );
  }
  if (!previous || !current) return;

  const keys = Object.keys(current);

  for (const key of keys) {
    let a = (current as any)[key];
    let b = (previous as any)[key];

    // the field could be a token.
    if (typeof a == "object" && "data" in a) {
      a = a.data;
      b = b.data;
    } else if (typeof a == "object") continue;

    if (a !== b) {
      throw new Error(
        `Relationship status for column "${thisColumn.name.data}" changed at key "${key}": "${b}" → "${a}".
        This is illegal! please remove your old field and add a new one to change properties of foreign keys.
It makes NO sense to even do this operation in the first place!`
      );
    }
  }
}

export function findDifferencesInModels(
  runOptions: RunOptions,
  thisModel: ModelInfo,
  existingModel: ModelInfo
): FoundModelDifferences | null {
  let columnsToBeAdded = new Array<ColumnInfo>();
  let columnsToBeUpdated = new Array<ColumnInfo>();
  let columnsToBeRemoved = new Array<ColumnInfo>();

  for (let thisColumn of thisModel.columns) {
    const existingColumn = existingModel.columns.find(
      (v) => v.name.data.toLowerCase() == thisColumn.name.data.toLowerCase()
    );

    if (existingColumn) {
      const columnChanged = Object.keys(existingColumn).some((key) => {
        const a = (existingColumn as any)[key];
        const b = (thisColumn as any)[key];

        if (typeof a == "object" && key != "defaultValue") {
          if (runOptions.verbose)
            console.log(
              "Verbose Note: not checking differences in ColumnInfo#" +
                key +
                ", i expect this to be a problem in the future, but who knows."
            );
          return false;
        }
        if (key == "defaultValue") {
          return (
            existingColumn.defaultValue?.data !=
              thisColumn.defaultValue?.data ||
            existingColumn.defaultValue?.type != thisColumn.defaultValue?.type
          );
        }

        if (runOptions.verbose) console.log(a, " vs ", b);

        return a !== b;
      });

      ensureRelationStatusDidNotChange(thisColumn, existingColumn);

      if (columnChanged) {
        columnsToBeUpdated.push(thisColumn);
      }
    } else {
      columnsToBeAdded.push(thisColumn);
    }
  }

  for (let otherColumn of existingModel.columns) {
    const thisColumn = thisModel.columns.find(
      (v) => v.name.data == otherColumn.name.data
    );

    if (!thisColumn) {
      columnsToBeRemoved.push(otherColumn);
    }
  }

  if (runOptions.verbose) {
    console.log("Model '" + thisModel.name.data + "' differences found: ");
    console.log("Columns to ADD:", columnsToBeAdded);
    console.log("Columns to UPDATE:", columnsToBeUpdated);
    console.log("Columns to DROP:", columnsToBeRemoved);
  }

  // just in case, we do an extra validation step here:
  for (let newCol of columnsToBeAdded) {
    if (
      !newCol.defaultValue &&
      newCol.interstrict.relationshipStatus === undefined
    ) {
      writeErrorImpl(
        newCol.name,
        "Column '" +
          newCol.name.data +
          "' is a new column in model '" +
          newCol.interstrict.ownerModelName.data +
          "' and needs a default value."
      );
      return null;
    }
  }

  return {
    model: thisModel,
    columnsToBeAdded,
    columnsToBeRemoved,
    columnsToBeUpdated,
  };
}
