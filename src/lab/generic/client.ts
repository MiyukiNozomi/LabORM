import { IDriver } from "../drivers/idriver";

declare let $engineDecl: IDriver;

/*** @laborm-skip-to-here */
export class LabClient {
  private engine: IDriver;
  /*** @lab-generate-listing-here */

  public constructor() {
    this.engine = $engineDecl;
    //@lab-generate-listing-here
  }

  public async close() {
    await this.engine.close();
  }
}
