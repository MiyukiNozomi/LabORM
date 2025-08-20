import { IDriver } from "../../../shared/laborm-types";
import init from "./installed-driver";
import { ModelInterface } from "./modelInterface";
import { runtimeSchema, RuntimeSchema } from "./schemaTypes";

declare let $DatabaseOptions: any;

const DatabaseOptions = $DatabaseOptions;

export class LabClient {
  private driver: IDriver;
  private LoadedSchema: RuntimeSchema;

  [key: string]: any; // <- allows dynamic properties

  constructor() {
    this.driver = init(DatabaseOptions);
    this.LoadedSchema = runtimeSchema;
    this.LoadedSchema.modelNames.forEach((v) => {
      this[`${v[0].toLowerCase()}${v.substring(1)}`] = new ModelInterface(
        this,
        v,
        this.driver
      );
    });
  }
}

export default LabClient;
