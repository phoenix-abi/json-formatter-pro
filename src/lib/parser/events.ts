/**
 * Parser Events for Pull API
 *
 * Defines event types emitted by the streaming parser.
 * Events are yielded as the parser processes tokens, allowing
 * incremental processing of JSON without building the full AST.
 */

import type { JsonNode } from './types'
import type { NumberMode } from './numbers'

/**
 * Parser event types
 *
 * Events are emitted during parsing to represent the structure
 * of the JSON document as it's being processed.
 */
export type ParserEvent =
  | { type: 'startObject'; path: string }
  | { type: 'endObject'; path: string }
  | { type: 'startArray'; path: string }
  | { type: 'endArray'; path: string }
  | { type: 'key'; value: string; path: string }
  | { type: 'value'; value: JsonNode; path: string }

/**
 * Parser configuration options
 */
export interface ParserOptions {
  /** Number parsing mode (default: 'native') */
  numberMode?: NumberMode
  /** Maximum nesting depth (default: 1000) */
  maxDepth?: number
  /** Maximum key length in characters (default: 10000) */
  maxKeyLength?: number
  /** Maximum string value length (default: 1000000) */
  maxStringLength?: number
}

/**
 * Error thrown during parsing
 */
export class ParseError extends SyntaxError {
  constructor(
    message: string,
    public position: number,
    public path: string
  ) {
    super(`${message} at position ${position}, path: ${path}`)
    this.name = 'ParseError'
  }
}
