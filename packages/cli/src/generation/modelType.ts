import {
  ColumnInfo,
  JSPrimitiveType,
  ModelInfo,
  RuntimeTypeInfo,
  RuntimeTypeInfoObject,
  SchemaFile,
} from "../../../../shared/laborm-types";

export const GeneratorTypes = ["CreationOptions", "NoRef"] as const;
export type GeneratorType = (typeof GeneratorTypes)[number];

export class ModelTypeGenerator {
  private schema: SchemaFile;
  private kind?: GeneratorType;
  public calculatedFields: Record<string, RuntimeTypeInfoObject>;

  private runtimeTypings: boolean;
  private noRefGenerator?: ModelTypeGenerator;

  public constructor(schema: SchemaFile, kind?: GeneratorType) {
    this.kind = kind;
    this.schema = schema;
    this.runtimeTypings = false;
    this.calculatedFields = {};

    this.schema.models.forEach((v) => this.generatePrepareFieldsOf(v));
  }

  public runtimeTypeMode(noRefGenerator?: ModelTypeGenerator) {
    this.runtimeTypings = true;
    this.noRefGenerator = noRefGenerator;
    if (this.noRefGenerator) this.noRefGenerator.runtimeTypeMode();
    return this;
  }

  // General type locationing
  private generatePrepareFieldsOf(model: ModelInfo, allowRefs: boolean = true) {
    if (this.kind == "NoRef") allowRefs = false;

    this.calculatedFields[model.name.data] = {};

    for (let column of model.columns) {
      let isNullable = column.nullable;
      let isArray = false;
      let primitiveType = this.columnJSType(column);
      let tsType = undefined;

      let eitherObjects: RuntimeTypeInfoObject[] | undefined;

      if (this.kind != undefined) {
        isNullable =
          isNullable || column.defaultValue !== undefined || column.primaryKey;
      }

      if (column.interstrict.relationshipStatus) {
        if (!allowRefs) continue;
        isArray = column.interstrict.relationshipStatus.type == "Array";
        primitiveType = "object";

        const relObject = this.objectTypeFromRelation(column);
        tsType = relObject.tsTypename;
        eitherObjects = relObject.eitherObjects;
      }

      this.calculatedFields[model.name.data][column.name.data] = {
        name: column.name.data,
        tsTypeName: tsType ?? primitiveType,
        expectedPrimitiveType: primitiveType,

        isNullable,
        isArray,
        eitherObjects,
      };
    }

    return this.calculatedFields[model.name.data]!;
  }

  private objectTypeFromRelation(column: ColumnInfo) {
    const referencedModel = this.schema.models.find(
      (v) => v.name.data == column.interstrict.relationshipStatus!.modelName
    );
    const primaryKey = referencedModel?.columns.find(
      (v) => v.primaryKey == true
    );

    if (!referencedModel || !primaryKey)
      throw new Error(
        "Could not locate model " +
          column.interstrict.relationshipStatus!.modelName +
          "! (or it's missing a primary key)"
      );

    return {
      tsTypename: referencedModel.name.data + (this.kind ?? ""),
      eitherObjects: [
        {
          create: {
            name: "create",
            tsTypeName: column.name.data,
            expectedPrimitiveType: "object",
            eitherObjects: [
              this.generatePrepareFieldsOf(referencedModel, false),
            ],
            isArray: false,
            isNullable: false,
          } satisfies RuntimeTypeInfo,
        } as any, // The reason for the 'as any' here is a typescript *BUG*
        /***
         * You see, RuntimeTypeInfoObject is a dynamic structure,
         * and eitherObjects is supposed to be an array
         * of this dynamic structure.
         * The issue is: it's quite unironically not treating it as a dynamic structure,
         * resulting in this monstrosity
         */
        {
          connect: (<RuntimeTypeInfo>{
            name: "connect",
            tsTypeName: `Array<${this.columnJSType(primaryKey)}>`,
            expectedPrimitiveType: this.columnJSType(primaryKey),
            isArray: true,
            isNullable: false,
          }) satisfies RuntimeTypeInfo,
        } satisfies RuntimeTypeInfoObject,
      ],
    };
  }

  private stringifyObject(object: RuntimeTypeInfoObject, indent = 1) {
    let lines = new Array<string>();

    const keys = Object.keys(object);
    for (let key of keys) {
      let currLine = "".padStart(indent, "\t");

      const value = object[key];
      if (
        value.tsTypeName !== undefined &&
        value.expectedPrimitiveType !== undefined
      ) {
        currLine += this.stringifyTypeField(
          value as RuntimeTypeInfo,
          this.convertType(value as RuntimeTypeInfo, indent + 1)
        );
      } else {
        currLine += this.stringifyObject(
          value as RuntimeTypeInfoObject,
          indent + 1
        );
      }

      lines.push(currLine);
    }

    return `{
${lines.join(",\n")}
${"".padStart(Math.max(0, indent - 1), "\t")}}`;
  }

  private stringifyTypeField(v: RuntimeTypeInfo, typeString: string) {
    return `${v.name}${v.isNullable ? "?" : ""}: ${typeString}`;
  }

  private convertType(col: RuntimeTypeInfo, indent = 0) {
    const text =
      col.eitherObjects
        ?.map((v) => this.stringifyObject(v, indent))
        .join(" | ") ?? col.tsTypeName;

    if (col.isArray) return `Array<${text}>`;
    return text;
  }

  private columnJSType(column: ColumnInfo): JSPrimitiveType {
    switch (column.type) {
      case "FLOAT":
      case "INT":
        return "number"; // Absolutely trolled! imagine not having proper integeer types lmao
      case "STRING":
        return "string";
      case "RELATION":
        return "object";
      default:
        throw new Error(`Type not properly implemented! '${column.type}'`);
    }
  }

  private mappingToDeclaration(
    modelName: string,
    mapping: RuntimeTypeInfoObject
  ) {
    return `export type ${modelName}${this.kind ?? ""} = ${this.stringifyObject(
      mapping
    )}`;
  }

  public generate(list?: string[]) {
    if (this.runtimeTypings)
      throw new Error(
        "It appears you tried to generate normal typings while runtimeTypings was set to true. Please check your commits."
      );
    if (!list) list = new Array<string>();
    this.schema.models.forEach((v) => {
      const mapping = this.calculatedFields[v.name.data];
      list.push(this.mappingToDeclaration(v.name.data, mapping));
    });
    return list;
  }

  public generateRuntime() {
    return this.mappingToDeclaration;
  }
}
