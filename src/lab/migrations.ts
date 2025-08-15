import { RunOptions } from "..";
import { ColumnInfo, ModelInfo, NativeDatabase, SchemaFile } from "./schema";
import { writeErrorImpl } from "./tools";

export type FoundDifferences = {
  model: ModelInfo;

  columnsToBeAdded: ColumnInfo[];
  columnsToBeRemoved: ColumnInfo[];
  columnsToBeUpdated: ColumnInfo[];
};

/***
 *  Methods that lack database modifications
 */
function findDifferencesInModels(
  thisModel: ModelInfo,
  existingModel: ModelInfo
): FoundDifferences | null {
  let columnsToBeAdded = new Array<ColumnInfo>();
  let columnsToBeUpdated = new Array<ColumnInfo>();
  let columnsToBeRemoved = new Array<ColumnInfo>();

  for (let thisColumn of thisModel.columns) {
    const existingColumn = existingModel.columns.find(
      (v) => v.name.data.toLowerCase() == thisColumn.name.data.toLowerCase()
    );

    if (existingColumn) {
      if (
        existingColumn.type != thisColumn.type ||
        existingColumn.nullable != thisColumn.nullable ||
        existingColumn.primaryKey != thisColumn.primaryKey ||
        existingColumn.autoIncrement != thisColumn.autoIncrement ||
        !existingColumn.defaultValue != !thisColumn.defaultValue ||
        existingColumn.defaultValue?.data != thisColumn.defaultValue?.data
      ) {
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

  if (RunOptions.VERBOSE) {
    console.log("Model '" + thisModel.name.data + "' differences found: ");
    console.log("Columns to ADD:", columnsToBeAdded);
    console.log("Columns to UPDATE:", columnsToBeUpdated);
    console.log("Columns to DROP:", columnsToBeRemoved);
  }

  // just in case, we do an extra validation step here:
  let hasError = false;
  for (let newCol of columnsToBeAdded) {
    if (!newCol.defaultValue) {
      hasError = true;
      writeErrorImpl(
        newCol.name,
        "Column '" +
          newCol.name.data +
          "' is a new column in model '" +
          newCol.ownerModelName.data +
          "' and needs a default value."
      );
    }
  }

  return hasError
    ? null
    : {
        model: thisModel,
        columnsToBeAdded,
        columnsToBeRemoved,
        columnsToBeUpdated,
      };
}

function findDifferencesInSchema(
  currentSchema: SchemaFile,
  physicalSchema: SchemaFile
) {
  let modelsToDrop = new Array<ModelInfo>();
  let modelsToAdd = new Array<ModelInfo>();
  let modelDifferencesList = new Array<FoundDifferences>();

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
      if (RunOptions.VERBOSE) {
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
      const differences = findDifferencesInModels(thisModel, existingModel);

      if (!differences) return null;

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

/***
 * The method that does in fact modify the database.
 */
export async function performMigrations(engine: NativeDatabase) {
  let physicalSchema = await engine.driver.loadSchema();

  if (!physicalSchema) {
    if (!RunOptions.FORCE_MIGRATION) {
      console.log(
        `Yikes! it appears your physical database has no actual schema!
...or LabORM couldn't find its own schema.

I'm not proceeding automatically because it might just happen that you *could* have data
in your database, and by forcefully applying the LabORM-generated schema your data could be lost.

Ignore this if this is the first time you run 'laborm migrate'.
Migration will not occur unless --force-migrate is specified.`
      );
      return -1;
    }

    if (RunOptions.VERBOSE) {
      console.log(
        "Physical schema is missing, creating tables for models: ",
        engine.schema.models
      );
    }

    for (let thisModel of engine.schema.models) {
      await engine.driver.createTable(thisModel);
    }

    await engine.driver.storeSchema(engine.schema);
    console.log("Successfully initialized database.");
    return 0;
  }

  const schemaDifferences = findDifferencesInSchema(
    engine.schema,
    physicalSchema
  );
  if (!schemaDifferences) return -1;

  if (
    schemaDifferences.modelsToDrop.length > 0 &&
    !RunOptions.FORCE_MIGRATION
  ) {
    console.log("WARNING WARNING!");
    console.log(
      "You're about to drop: " +
        schemaDifferences.modelsToDrop.map((v) => v.name.data) +
        ", are you sure? pass --force-migrate if yes."
    );
    return -1;
  }

  for (let newModel of schemaDifferences.modelsToAdd) {
    await engine.driver.createTable(newModel);
    console.log("Successfully added model '" + newModel.name.data + "'");
  }

  for (let modelToDrop of schemaDifferences.modelsToDrop) {
    await engine.driver.dropTable(modelToDrop.name.data);
    console.log("Successfully dropped model '" + modelToDrop.name.data + "'");
  }

  for (let modelDifferences of schemaDifferences.modelDifferencesList) {
    if (
      modelDifferences.columnsToBeAdded.length == 0 &&
      modelDifferences.columnsToBeRemoved.length == 0 &&
      modelDifferences.columnsToBeUpdated.length == 0
    )
      console.log(
        "No changes in model '" + modelDifferences.model.name.data + "'"
      );
    for (let columToAdd of modelDifferences.columnsToBeAdded) {
      if (RunOptions.VERBOSE) console.log("Adding: ", columToAdd);
      engine.driver.addColumn(columToAdd);
    }

    for (let columToUpdate of modelDifferences.columnsToBeUpdated) {
      if (RunOptions.VERBOSE) console.log("Update: ", columToUpdate);
      engine.driver.updateColumn(columToUpdate);
    }

    for (let columToDrop of modelDifferences.columnsToBeRemoved) {
      if (RunOptions.VERBOSE) console.log("dROP: ", columToDrop);
      engine.driver.dropColumn(columToDrop);
    }
  }

  await engine.driver.storeSchema(engine.schema);
  return 0;
}
