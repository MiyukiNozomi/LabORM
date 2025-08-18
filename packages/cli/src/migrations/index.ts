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

    for (let model of db.schema.models) await db.driver.createTable(model);

    await db.driver.storeSchema(db.schema);
    return;
  }

  const diffs = findDifferencesInSchema(runOptions, db.schema, physicalSchema);

  for (let modelToDrop of diffs.modelsToDrop) {
    await db.driver.dropTable(modelToDrop.name.data);
  }

  for (let modelToAdd of diffs.modelsToAdd) {
    await db.driver.createTable(modelToAdd);
  }

  // applying model-specific differences now...
  for (let modelDifferences of diffs.modelDifferencesList) {
    for (let columnToAdd of modelDifferences.columnsToBeAdded)
      await db.driver.addColumn(columnToAdd);

    for (let columnToRemoved of modelDifferences.columnsToBeRemoved)
      await db.driver.dropColumn(columnToRemoved);

    for (let columnToUpdate of modelDifferences.columnsToBeUpdated)
      await db.driver.updateColumn(columnToUpdate);
  }

  await db.driver.storeSchema(db.schema);
  console.log("Migrations applied successfully!");
}
