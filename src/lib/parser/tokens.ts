/**
 * Token Types for JSON Lexer
 *
 * Defines the token types produced by the tokenizer.
 * Each token includes source position information for error reporting
 * and source mapping.
 */

/**
 * Union type representing all possible tokens
 */
export type Token =
  | { type: 'lbrace'; start: number; end: number }          // {
  | { type: 'rbrace'; start: number; end: number }          // }
  | { type: 'lbracket'; start: number; end: number }        // [
  | { type: 'rbracket'; start: number; end: number }        // ]
  | { type: 'colon'; start: number; end: number }           // :
  | { type: 'comma'; start: number; end: number }           // ,
  | { type: 'string'; value: string; raw: string; start: number; end: number }
  | { type: 'number'; raw: string; start: number; end: number }
  | { type: 'true'; start: number; end: number }
  | { type: 'false'; start: number; end: number }
  | { type: 'null'; start: number; end: number }
  | { type: 'eof'; start: number; end: number }

/**
 * Position in source text
 *
 * Useful for error reporting and source mapping.
 * All indices are 1-based for human readability.
 */
export interface Position {
  /** Byte/character offset (0-indexed) */
  offset: number
  /** Line number (1-indexed) */
  line: number
  /** Column number (1-indexed) */
  column: number
}

/**
 * Error thrown during tokenization
 */
export class TokenizerError extends SyntaxError {
  constructor(
    message: string,
    public position: number,
    public line?: number,
    public column?: number
  ) {
    super(message)
    this.name = 'TokenizerError'
  }
}
