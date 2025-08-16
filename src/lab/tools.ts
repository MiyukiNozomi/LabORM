import { existsSync, readdirSync, rmdirSync, statSync, unlinkSync } from "fs";
import { Token } from "./lexer";
import path from "path";
import { RunOptions } from "..";

export function writeErrorImpl(token: Token, ...message: string[]) {
  console.error(
    `${token.filename}:${token.line}:${token.column}:error: ${message.join(
      " "
    )}`
  );
}

export function removeAllFiles(pathname: string) {
  let filesToDelete = readdirSync(pathname);

  for (let i = 0; i < filesToDelete.length; i++) {
    const filePath = path.join(pathname, filesToDelete[i]!);

    if (RunOptions.VERBOSE) console.log("Removing file/directory: " + filePath);

    if (statSync(filePath).isFile()) {
      unlinkSync(filePath);
    } else if (existsSync(filePath)) {
      readdirSync(filePath)
        .map((v) => path.join(filePath, v))
        .forEach((v) => removeAllFiles(v));
      if (RunOptions.VERBOSE)
        console.log(
          "Directory files at: " + filePath + " deleted, removing directory."
        );
      rmdirSync(filePath);
    }
  }
}
