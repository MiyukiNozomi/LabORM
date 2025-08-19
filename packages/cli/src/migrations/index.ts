import { RunOptions } from "..";
import { NativeDatabase } from "../../../../shared/laborm-types";
import { findDifferencesInSchema } from "./schemaDifferences";

export async function applyMigrations(
  runOptions: RunOptions,
  db: NativeDatabase
) {
  const physicalSchema = await db.driver.loadSchema();

  if (!physicalSchema) {
    console.log("First time migration spotted!");

    for (let model of db.schema.models)
      await db.driver.createTable(db.schema, model);

    await db.driver.storeSchema(db.schema);
    return;
  }

  const diffs = findDifferencesInSchema(runOptions, db.schema, physicalSchema);

  if (runOptions["no-action"]) {
    console.log("Changes: ");
    diffs.modelsToAdd.forEach((V) => console.log("ADD TABLE", V.name.data));
    diffs.modelDifferencesList.forEach((v) => {
      console.log("UPDATE TABLE", v.model.name.data);
      v.columnsToBeAdded.forEach((v) =>
        console.log("\tADD COLUMN", v.name.data)
      );
      v.columnsToBeUpdated.forEach((v) =>
        console.log("\tUPDATE COLUMN", v.name.data)
      );
      v.columnsToBeRemoved.forEach((v) =>
        console.log("\tDROP COLUMN", v.name.data)
      );
    });
    diffs.modelsToDrop.forEach((V) => console.log("DROP TABLE", V.name.data));

    console.log(
      "Please note no actual database modifications have been made. (--no-action flag active)"
    );
    return;
  }
  // applying model-specific differences now...
  for (let modelDifferences of diffs.modelDifferencesList) {
    for (let columnToAdd of modelDifferences.columnsToBeAdded)
      await db.driver.addColumn(db.schema, columnToAdd);

    for (let columnToRemoved of modelDifferences.columnsToBeRemoved)
      await db.driver.dropColumn(db.schema, columnToRemoved);

    for (let columnToUpdate of modelDifferences.columnsToBeUpdated)
      await db.driver.updateColumn(db.schema, columnToUpdate);
  }

  for (let modelToDrop of diffs.modelsToDrop) {
    await db.driver.dropTable(db.schema, modelToDrop);
  }

  for (let modelToAdd of diffs.modelsToAdd) {
    await db.driver.createTable(db.schema, modelToAdd);
  }

  await db.driver.storeSchema(db.schema);
  console.log("Migrations applied successfully!");
}
