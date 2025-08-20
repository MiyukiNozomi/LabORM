import { RunOptions } from "..";
import { SchemaFile } from "../../../../shared/laborm-types";
import { generateClient } from "../generation";
import { getSchema } from "../schema";

export async function implGenerate(flags: RunOptions, schema?: SchemaFile) {
  if (!schema) schema = getSchema(flags);
  await generateClient(flags, schema);
}
