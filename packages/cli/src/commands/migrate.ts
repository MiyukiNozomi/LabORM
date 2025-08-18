import { RunOptions } from "..";
import { loadDatabaseDriver } from "../db";
import { applyMigrations } from "../migrations";
import { getSchema } from "../schema";

export async function implMigrate(flags: RunOptions) {
  const db = await loadDatabaseDriver(flags, getSchema(flags));
  await applyMigrations(flags, db);
  console.log(" == migration process completed == ");
}
