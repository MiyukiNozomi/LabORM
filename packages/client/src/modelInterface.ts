import LabClient from "./client";
import {
  JSPrimitiveType,
  IDriver,
  ModelInfo,
} from "../../../shared/laborm-types";

export class ModelInterface<T extends object, E extends Object> {
  private client: LabClient;
  private currentModel: ModelInfo;
  private driver: IDriver;

  /**
   * Okay, i get it, it's weird these fields are marked as 'any'
   * but the reason is that we don't want these types being exposed on the final ModelInterface declaration.
   */
  constructor(client: any, currentModel: any, driver: any) {
    this.client = client;
    this.currentModel = currentModel;
    this.driver = driver;
  }

  public async insert(object: E): Promise<T> {
    /*
    this.driver.insert(
      this.currentModel.name.data,
      this.validateOrThrow(object)
    );*/

    return {} as T;
  }

  /** 
  private validateOrThrow(object: T) {
    const out = this.validateObject(object, this.currentModel.JSPrimitiveType);

    if (!out)
      throw new Error(
        "Cannot insert into table '" +
          this.currentModel.name.data +
          "' with: \n" +
          JSON.stringify(object, null, 2) +
          "\n because it does not match following type specification: \n" +
          JSON.stringify(this.currentModel.JSPrimitiveType, null, 2)
      );
    return out;
  }

  private validateObject(
    object: T,
    checkedType: JSPrimitiveType | ModelTyping
  ) {
    const queryType = typeof object;
    const existingPrimitiveType =
      typeof checkedType == "object" ? "object" : checkedType;

    if (queryType !== existingPrimitiveType) {
      return undefined;
    } else if (existingPrimitiveType != "object") return object;

    const checkedObjectType = checkedType as ModelTyping;

    const objectKeys = Object.keys(object);
    const requiredKeys = Object.keys(checkedObjectType);

    let outputObject: Record<string, any> = {};

    for (let v of requiredKeys) {
      if (!objectKeys.includes(v)) {
        return undefined;
      }

      outputObject[v] = this.validateObject(
        (object as any)[v],
        (checkedObjectType as any)[v]
      );
    }
    return outputObject;
  }*/
}
