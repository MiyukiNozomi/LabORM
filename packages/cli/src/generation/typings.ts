import { readFileSync, writeFileSync } from "fs";
import { SchemaFile } from "../../../../shared/laborm-types";
import path from "path";
import { GeneratorTypes, ModelTypeGenerator } from "./modelType";

export async function genTypings(outDir: string, schema: SchemaFile) {
  let modelDeclarations = new ModelTypeGenerator(schema).generate();

  GeneratorTypes.forEach((v) => {
    new ModelTypeGenerator(schema, v).generate(modelDeclarations);
  });

  modelDeclarations.push(genModelImplementation());

  modelDeclarations.push(`export declare class LabClient {
\t${schema.models
    .map(
      (v) =>
        `public readonly ${v.name.data[0].toLowerCase()}${v.name.data.substring(
          1
        )} : ModelInterface<${[
          v.name.data,
          v.name.data + `CreationOptions`,
        ].join(",")}>;`
    )
    .join("\n\t")}

\tconstructor();
}
export default LabClient;
`);

  writeFileSync(
    path.resolve(outDir, "index.d.ts"),
    modelDeclarations.join("\n\n")
  );
}

function genModelImplementation(): string {
  const file = readFileSync(
    path.resolve(__dirname, "../../client/modelInterface.d.ts")
  ).toString();

  // just ready in case i ever need to mod this declaration at runtime.
  return file;
}
