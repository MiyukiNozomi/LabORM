import { RunOptions } from "..";
import { loadDatabaseDriver } from "../db";
import { generateClient } from "../generation";
import { applyMigrations } from "../migration";
import { getSchema } from "../schema";

export async function implMigrate(flags: RunOptions) {
  const db = await loadDatabaseDriver(flags, getSchema(flags));
  await applyMigrations(flags, db);
  await generateClient(flags, db.schema);
  console.log(" == migration process completed == ");
}
