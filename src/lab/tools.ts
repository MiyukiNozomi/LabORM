import { Token } from "./lexer";

export function writeErrorImpl(token: Token, ...message: string[]) {
  console.error(
    `${token.filename}:${token.line}:${token.column}:error: ${message.join(
      " "
    )}`
  );
}
