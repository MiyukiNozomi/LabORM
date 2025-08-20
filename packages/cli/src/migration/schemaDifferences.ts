import { RunOptions } from "..";
import { ModelInfo, SchemaFile } from "../../../../shared/laborm-types";
import {
  findDifferencesInModels,
  FoundModelDifferences,
} from "./modelDifferences";

export function findDifferencesInSchema(
  runOptions: RunOptions,
  currentSchema: SchemaFile,
  physicalSchema: SchemaFile
) {
  let modelsToDrop = new Array<ModelInfo>();
  let modelsToAdd = new Array<ModelInfo>();
  let modelDifferencesList = new Array<FoundModelDifferences>();

  for (let existingModel of physicalSchema.models) {
    if (
      !currentSchema.models.find(
        (v) =>
          v.name.data.toLowerCase() == existingModel.name.data.toLowerCase()
      )
    )
      modelsToDrop.push(existingModel);
  }

  for (let thisModel of currentSchema.models) {
    let existingModel = physicalSchema.models.find(
      (v) => v.name.data.toLowerCase() == thisModel.name.data.toLowerCase()
    );

    if (!existingModel) {
      if (runOptions.verbose) {
        console.log(
          "Model '" +
            thisModel.name.data +
            "' does not exist in stored schema (stored schema:",
          JSON.stringify(physicalSchema.models, null, 2),
          ")"
        );
        console.log(
          "Model '",
          thisModel.name.data,
          "' creation requested to driver."
        );
      }
      modelsToAdd.push(thisModel);
    } else {
      const differences = findDifferencesInModels(
        runOptions,
        thisModel,
        existingModel
      );

      if (!differences) process.exit(-1);

      if (differences.columnsToBeRemoved.length > 0) {
        console.log(
          "The following COLUMNS will be DROPPED: ",
          differences.columnsToBeRemoved
        );
      }
      modelDifferencesList.push(differences);
    }
  }

  return {
    modelDifferencesList,
    modelsToAdd,
    modelsToDrop,
  };
}
