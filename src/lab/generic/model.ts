/*** This is a placeholder object, don't worry about it. */
import { IDriver } from "../drivers/idriver";

declare let $ModelSchemaDecl: ModelSchemaTyping;

export type ModelSchemaTyping = {
  name: string;
  columns: Record<string, string>;
};

/*** @laborm-skip-to-here */
export class ModelClientImpl<T extends Object> {
  private driver: IDriver;
  private modelSchema: ModelSchemaTyping;

  public constructor(driver: IDriver) {
    this.driver = driver;
    this.modelSchema = $ModelSchemaDecl;
  }

  public async insert(data: T): Promise<T> {
    return (await this.driver.insert(
      this.modelSchema.name,
      this.validateObject(data)
    )) as T;
  }

  private validateObject(object: T) {
    const objectKeys = Object.keys(object);

    for (let objectKey of objectKeys) {
      const existingColumnType = this.modelSchema.columns[objectKey];
      if (existingColumnType == undefined) {
        throw `Model "${objectKey}" does not have a column named "${objectKey}".`;
      }

      const queryType = typeof (object as any)[objectKey];
      if (queryType !== existingColumnType) {
        throw `Model "${objectKey}"'s Column "${objectKey}" is of type "${existingColumnType}", not "${queryType}".`;
      }
    }

    return object as Record<string, any>;
  }
}
