import { SQLite3Driver, SQLite3DriverOptions } from "./sqlite3";

export default function init(options: SQLite3DriverOptions) {
  return new SQLite3Driver(options);
}
