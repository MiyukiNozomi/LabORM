import { ISchemaDriver } from "./schemaDriver";

export type DriverOptionsOrErrors<T> = {
  errors: string[];
  driverOptions?: T;
};

/**
 * To contributors,
 *
 * Here's a few basic explanations here:
 * **YES**, all drivers must be asynchronous in nature.
 * This is due to the fact *some* database bind
 */
export interface IDriver {
  /*** tools */
  printSetupMessage(): Promise<void>;

  /*** Data management */

  insert(tableName: string, values: Record<string, any>): Promise<unknown>;

  /*** Schema Management */
  schemaDriver(): ISchemaDriver;

  /*** Other */
  close(): Promise<void>;
}
