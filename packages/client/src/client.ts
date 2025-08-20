import { IDriver, ModelInfo, SchemaFile } from "../../../shared/laborm-types";
import init from "./installed-driver";
import { ModelInterface } from "./modelInterface";

declare let $SchemaLoaded: ModelInfo[];
declare let $DatabaseOptions: any;

const LoadedSchema = $SchemaLoaded;
const DatabaseOptions = $DatabaseOptions;

export class LabClient {
  private driver: IDriver;

  [key: string]: any; // <- allows dynamic properties

  constructor() {
    this.driver = init(DatabaseOptions);
    LoadedSchema.forEach((v) => {
      this[`${v.name.data[0].toLowerCase()}${v.name.data.substring(1)}`] =
        new ModelInterface(this, v, this.driver);
    });
  }
}

export default LabClient;
