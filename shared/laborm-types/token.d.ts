export type TokenType =
  | "INVALID" // also applies for words starting with @
  | "IDENTIFIER"
  | "KEYWORD_MODEL"
  | "KEYWORD_ENGINE"
  | "STRING"
  | "INT"
  | "FLOAT"
  | "LBRACE"
  | "RBRACE"
  | "DOUBLE_DOT"
  | "EOF"; // used by the parser

export type Token = {
  type: TokenType;
  line: number;
  column: number;
  data: string;

  filename: string;
};
