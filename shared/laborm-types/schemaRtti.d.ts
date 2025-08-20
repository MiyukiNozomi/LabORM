// Schema information, but for runtime type validation.

export type JSPrimitiveType = "string" | "number" | "boolean" | "object";

export interface RuntimeTypeInfoObject {
  [key: string]: RuntimeTypeInfo | RuntimeTypeInfoObject;
}

export type RuntimeTypeInfo = {
  name: string;
  tsTypeName: JSPrimitiveType | string;
  expectedPrimitiveType: JSPrimitiveType;

  isNullable: boolean;
  isArray: boolean;
  eitherObjects?: RuntimeTypeInfoObject[];
};
