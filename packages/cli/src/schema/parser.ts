import { SchemaLexer, Token, TokenType, writeErrorImpl } from "./lexer";
import {
  ColumnInfo,
  ColumnType,
  ModelInfo,
  SchemaFile,
} from "../../../../shared/laborm-types";

/**
 * Parses schema files.
 * Please note this function wont do any actual validation
 * besides ensure that the selected database engine has a driver for it in SUPPORTED_DRIVERS.
 *
 * TODO: proper support for multiple schema files
 *
 * @see idriver.ts
 * @see schema.ts
 */
export class SchemaParser {
  private tokens: Token[];
  private filename: string;
  public hadError: boolean;
  public schemaFile: SchemaFile;

  public constructor(filename: string, source: string) {
    this.tokens = new SchemaLexer(filename, source).lex();
    this.filename = filename;
    this.hadError = false;
    this.schemaFile = {
      models: [],
    };
  }

  public parse() {
    while (this.notEOF()) {
      if (this.consume("KEYWORD_ENGINE")) {
        this.parseEngine();
      } else if (this.consume("KEYWORD_MODEL")) {
        this.parseModel();
      } else {
        const curr = this.current();
        this.writeError(
          curr,
          `Unrecognized token at top-level scope: '${curr.data}' (of type ${curr.type})`
        );
        this.next();
      }
    }

    return this.hadError ? undefined : this.schemaFile;
  }

  public parseModel() {
    let model: ModelInfo = {
      name: this.match("IDENTIFIER", "Expected a valid model name."),
      columns: [],
    };

    this.match("LBRACE", "Missing opening brace.");
    while (this.current().type != "RBRACE" && this.notEOF()) {
      const columnName = this.match(
        "IDENTIFIER",
        "Expected a valid column name!"
      );
      const columnTypeToken = this.match(
        "IDENTIFIER",
        "Expected a valid column type here!"
      );
      const columnType = this.detectColumnType(columnTypeToken);

      let column: ColumnInfo = {
        name: columnName,
        type: columnType,
        nullable: false,
        primaryKey: false,
        autoIncrement: false,

        interstrict: {
          ownerModelName: model.name,
          columnTypeToken: columnTypeToken,
        },
      };

      if (this.consume("LSQUARE")) {
        this.match("RSQUARE", "Mismatched square braces!");

        column.interstrict.relationshipStatus = {
          type: "Array",
          modelName: columnTypeToken.data,
        };
      } else if (this.consume("KEYWORD_RELATION")) {
        this.match(
          "LPAREN",
          "Incorrect @relation syntax! expected: @relation(localFieldNameToCreate, otherFieldName)"
        );

        const thisField = this.match(
          "IDENTIFIER",
          "Expected a valid local field name!"
        );
        this.match("COMMA", "Missing a ',' between field names.");
        const otherField = this.match(
          "IDENTIFIER",
          "Expected a valid local field name!"
        );

        this.match("RPAREN", "Mistmached @relation parenthesis.");

        column.interstrict.relationshipStatus = {
          type: "Field",
          modelName: columnTypeToken.data,
          otherFieldName: otherField,
          thisFieldName: thisField,
        };
      }

      let line = column.name.line;

      while (this.current().line == line) {
        const modifier = this.match(
          "IDENTIFIER",
          "Invalid modifier (please separate your columns by line if intended"
        );

        switch (modifier.data.toLowerCase()) {
          case "nullable":
            column.nullable = true;
            break;
          case "primary":
            column.primaryKey = true;
            break;
          case "autoincrement":
            column.autoIncrement = true;
            break;
          case "default":
            column.defaultValue = this.next();
            break;
          default:
            this.writeError(
              modifier,
              "Unrecognized column modifier:",
              modifier.data
            );
            break;
        }
      }

      model.columns.push(column);
    }
    this.match("RBRACE", "Mismatched braces.");

    this.schemaFile.models.push(model);
  }

  public detectColumnType(tk: Token): ColumnType {
    switch (tk.data.toLowerCase()) {
      case "string":
      case "int":
      case "float":
        return tk.data.toUpperCase() as ColumnType;
      default:
        return "RELATION"; // treat it as a relation right now.
    }
  }

  public parseEngine() {
    this.schemaFile.engineOptions = {
      name: this.match("IDENTIFIER", "Need a valid engine name here!"),
      options: {},
    };

    this.match("LBRACE", "Missing opening brace.");
    while (this.current().type != "RBRACE" && this.notEOF()) {
      const key = this.match("IDENTIFIER", "Invalid option name!");
      this.match(
        "DOUBLE_DOT",
        "Incorrect key-value syntax, example: key: value"
      );
      const value = this.next();

      this.schemaFile.engineOptions.options[key.data] = value;
    }
    this.match("RBRACE", "Mismatched braces.");
  }

  private current() {
    return (
      this.tokens[0] ?? {
        column: 0,
        line: 0,
        data: "",
        type: "EOF",
        filename: this.filename,
      }
    );
  }

  private next() {
    let last = this.current();
    this.tokens.shift();
    return last;
  }

  private notEOF() {
    return this.current().type != "EOF";
  }

  private consume(type: TokenType) {
    if (this.current().type == type) {
      this.next();
      return true;
    }
    return false;
  }

  private match(type: TokenType, ...errorMessage: string[]) {
    if (this.current().type != type) {
      this.writeError(this.current(), ...errorMessage);
    }
    return this.next();
  }

  private writeError(token: Token, ...message: string[]) {
    writeErrorImpl(token, ...message);
    this.hadError = true;
  }
}
