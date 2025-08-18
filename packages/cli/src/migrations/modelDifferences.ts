import { RunOptions } from "..";
import { ColumnInfo, ModelInfo } from "../../../../shared/laborm-types";
import { writeErrorImpl } from "../schema/lexer";

export type FoundModelDifferences = {
  model: ModelInfo;

  columnsToBeAdded: ColumnInfo[];
  columnsToBeRemoved: ColumnInfo[];
  columnsToBeUpdated: ColumnInfo[];
};

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
    if (!newCol.defaultValue) {
      writeErrorImpl(
        newCol.name,
        "Column '" +
          newCol.name.data +
          "' is a new column in model '" +
          newCol.ownerModelName.data +
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
