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

export class SchemaLexer {
  private position: number;
  private NextCurrLine: number;
  private NextCurrColumn: number;

  private filename: string;
  private source: string;

  public constructor(filename: string, source: string) {
    this.filename = filename;
    this.source = source;

    this.position = 0;
    this.NextCurrLine = 1;
    this.NextCurrColumn = 0;
  }

  public lex(): Array<Token> {
    let tokens = new Array<Token>();

    while (true) {
      while (true) {
        // Comments are also whitespace here
        if (this.isWhitespace()) {
          while (this.isWhitespace()) this.next();
        } else if (this.current() == "/") {
          this.next();
          if (this.current() == "*") {
            while (this.notEOF()) {
              if (this.current() == "*" && this.peek(1) == "/") break;
              this.next();
            }
            this.next();
            this.next();
          } else if (this.current() == "/") {
            while (this.notEOF() && this.current() != "\n") this.next();
          }
        } else {
          break;
        }
      }

      if (!this.notEOF()) {
        break;
      }
      let baseTokenData = {
        filename: this.filename,
        column: this.NextCurrColumn,
        line: this.NextCurrLine,
      };

      /*** WORDS ***/
      if (this.isLetter()) {
        let cc = "";
        while (this.isLetter() || this.isNumber()) cc += this.next();
        tokens.push({
          ...baseTokenData,
          data: cc,
          type: this.identifyWord(cc),
        });
        /*** NUMBERS ***/
      } else if (this.isNumber()) {
        let cc = "";

        while (this.isNumber() || (this.current() == "." && !cc.includes(".")))
          cc += this.next();

        tokens.push({
          ...baseTokenData,
          data: cc,
          type: cc.includes(".") ? "FLOAT" : "INT",
        });
        /*** STRINGS ***/
      } else if (
        this.current() == "`" ||
        this.current() == '"' ||
        this.current() == "'"
      ) {
        let start = this.next();
        let cc = "";

        while (this.notEOF() && this.current() != start) {
          if (this.current() == "\\") cc += this.next();
          cc += this.next();
        }

        this.next();
        tokens.push({ ...baseTokenData, data: cc, type: "STRING" });
      } else if (this.current() == "{" || this.current() == "}") {
        let cc = this.next();
        tokens.push({
          ...baseTokenData,
          data: cc,
          type: cc == "{" ? "LBRACE" : "RBRACE",
        });
      } else if (this.current() == ":") {
        tokens.push({
          ...baseTokenData,
          data: this.next(),
          type: "DOUBLE_DOT",
        });
      } else {
        tokens.push({
          ...baseTokenData,
          data: this.next(),
          type: "INVALID",
        });
      }
    }

    return tokens;
  }

  private identifyWord(cc: string): TokenType {
    switch (cc.toLowerCase()) {
      case "@engine":
        return "KEYWORD_ENGINE";
      case "model":
        return "KEYWORD_MODEL";
      default:
        return cc.startsWith("@") ? "INVALID" : "IDENTIFIER";
    }
  }

  private notEOF() {
    return this.current() != "\0";
  }

  private peek(dist: number) {
    return this.source[this.position + dist] ?? "\0";
  }
  private current() {
    return this.source[this.position] ?? "\0";
  }

  private next() {
    let c = this.current();
    this.position++;
    if (c == "\n") {
      this.NextCurrLine++;
      this.NextCurrColumn = 0;
    } else {
      this.NextCurrColumn++;
    }
    return c;
  }

  private isWhitespace() {
    return (
      this.notEOF() && this.current().trim().length != this.current().length
    );
  }

  private isLetter() {
    return (
      this.notEOF() &&
      (this.current().toUpperCase() != this.current().toLowerCase() ||
        this.current() == "@")
    );
  }

  private isNumber() {
    return this.notEOF() && !isNaN(parseInt(this.current()));
  }
}
