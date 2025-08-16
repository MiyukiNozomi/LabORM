import { IDriver } from "../drivers/idriver";

declare let $engineDecl: IDriver;

export default class LabClient {
  public engine: IDriver;

  constructor() {
    // supposedly this is of type IDriver.
    this.engine = $engineDecl;
  }
}
