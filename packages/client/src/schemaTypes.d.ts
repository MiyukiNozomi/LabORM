import { RuntimeTypeInfoObject } from "../../../shared/laborm-types";

export type RuntimeSchema = {
  modelNames: string[];
  modelTypes: Record<string, RuntimeTypeInfoObject>;
};
export declare let runtimeSchema: RuntimeSchema;
