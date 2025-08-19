export type TokenType =
  | "INVALID" // also applies for words starting with @
  /** KEYWORDS */
  | "IDENTIFIER"
  | "KEYWORD_MODEL"
  | "KEYWORD_ENGINE"
  | "KEYWORD_RELATION"
  /** LITERALS */
  | "STRING"
  | "INT"
  | "FLOAT"
  /** SYMBOLS */
  | "LBRACE"
  | "RBRACE"
  | "LPAREN"
  | "RPAREN"
  | "LSQUARE"
  | "RSQUARE"
  | "COMMA"
  | "DOUBLE_DOT"
  /** just a file indicator */
  | "EOF";
export type Token = {
  type: TokenType;
  line: number;
  column: number;
  data: string;

  filename: string;
};
