import { SchemaFile } from "../../../../shared/laborm-types";
import { GeneratorType, GeneratorTypes, ModelTypeGenerator } from "./modelType";

export class RuntimeTypeGenerator {
  public schema: SchemaFile;
  public main: ModelTypeGenerator;
  public generators: Record<GeneratorType, ModelTypeGenerator>;

  public constructor(schema: SchemaFile) {
    this.schema = schema;

    this.main = new ModelTypeGenerator(schema);

    // just so it doesn't bitches about it
    this.generators = {} as any;

    GeneratorTypes.forEach((v) => {
      this.generators[v] = new ModelTypeGenerator(schema, v);
    });
  }

  public toJSON() {
    let noRef = this.generators["NoRef"];
    let json: Record<string, string> = {};

    this.main.asRuntimeTypesMode(noRef).generateJSON(json);

    GeneratorTypes.forEach(
      (v) =>
        (json = this.generators[v].asRuntimeTypesMode(noRef).generateJSON(json))
    );

    const keys = Object.keys(json);

    return `export const runtimeSchema = {
\t"modelNames": ${JSON.stringify(this.schema.models.map((v) => v.name.data))},
\t"modelTypes": {
\t\t${keys.map((v) => `"${v}": ${json[v]}`).join(",\n\t\t")}
\t}
}

export default runtimeSchema;`;
  }
}
