/**
 * JSON Parser Types - Lossless AST
 *
 * This module defines the Abstract Syntax Tree (AST) types for our custom JSON parser.
 * Unlike native JSON.parse() which returns standard JavaScript types, this AST preserves:
 * - Exact source text positions (start/end offsets)
 * - Raw lexemes for lossless reconstruction
 * - Object key ordering as it appears in source
 * - Lossless number representation (BigInt, Decimal, or raw string)
 */

/**
 * Union type representing any JSON AST node
 */
export type JsonNode =
  | ObjectNode
  | ArrayNode
  | StringNode
  | NumberNode
  | BooleanNode
  | NullNode

/**
 * Object node with key-value entries
 *
 * Stores entries in an array to preserve exact textual order.
 * This differs from native JSON.parse() which may reorder numeric keys.
 */
export interface ObjectNode {
  kind: 'object'
  /** Entries in source text order */
  entries: Array<{ key: JsonString; value: JsonNode }>
  /** Start offset in source text */
  start: number
  /** End offset in source text (exclusive) */
  end: number
}

/**
 * Array node with ordered elements
 */
export interface ArrayNode {
  kind: 'array'
  /** Array elements in source order */
  items: JsonNode[]
  /** Start offset in source text */
  start: number
  /** End offset in source text (exclusive) */
  end: number
}

/**
 * String node with unescaped value and raw lexeme
 *
 * Note: raw field is optional to reduce memory overhead.
 * If needed, it can be computed on-demand using: input.substring(start, end)
 */
export interface StringNode {
  kind: 'string'
  /** Unescaped string value (e.g., "hello") */
  value: string
  /** Original lexeme including quotes (e.g., "\"hello\"") - optional to save memory */
  raw?: string
  /** Start offset in source text */
  start: number
  /** End offset in source text (exclusive) */
  end: number
}

/**
 * Number node with lossless representation
 *
 * Supports three representation modes:
 * - value: Standard JS number (may lose precision for large numbers)
 * - bigInt: For integers beyond Number.MAX_SAFE_INTEGER
 * - decimal: For precise decimal representation (stored as string)
 *
 * Note: raw field is optional to reduce memory overhead.
 * If omitted, it can be computed on-demand using: input.substring(start, end)
 */
export interface NumberNode {
  kind: 'number'
  /** Standard JS number (may lose precision) */
  value?: number
  /** BigInt representation for large integers */
  bigInt?: bigint
  /** Decimal representation as string for precision */
  decimal?: string
  /** Original lexeme (e.g., "123.456") - optional to save memory */
  raw?: string
  /** Start offset in source text */
  start: number
  /** End offset in source text (exclusive) */
  end: number
}

/**
 * Boolean node (true or false)
 */
export interface BooleanNode {
  kind: 'boolean'
  /** The boolean value */
  value: boolean
  /** Start offset in source text */
  start: number
  /** End offset in source text (exclusive) */
  end: number
}

/**
 * Null node
 */
export interface NullNode {
  kind: 'null'
  /** Start offset in source text */
  start: number
  /** End offset in source text (exclusive) */
  end: number
}

/**
 * String node alias for object keys
 *
 * In JSON, object keys are always strings.
 * This type alias makes the object entry structure clearer.
 */
export type JsonString = StringNode

/**
 * Parse error information for tolerant mode
 */
export interface ParseErrorInfo {
  /** Error message */
  message: string
  /** Position in input where error occurred */
  position: number
  /** JSONPath to location of error */
  path: string
  /** Type of error */
  type: 'syntax' | 'recovery' | 'validation'
  /** How the error was recovered (if applicable) */
  recovery?: string
}

/**
 * Parser result containing both the AST and original input
 *
 * The input string is included to enable on-demand computation of raw text
 * for nodes that omit it (to save memory).
 *
 * When tolerant mode is enabled, errors are collected instead of thrown.
 */
export interface ParserResult {
  /** The parsed AST */
  ast: JsonNode
  /** Original input string for on-demand raw computation */
  input: string
  /** Parse errors (only populated in tolerant mode) */
  errors?: ParseErrorInfo[]
}

/**
 * Number representation mode
 */
export type NumberMode = 'native' | 'bigint' | 'decimal' | 'string'

/**
 * Parser options
 */
export interface ParserOptions {
  /** How to represent numbers */
  numberMode?: NumberMode
  /** Enable error tolerance (best-effort parsing) */
  tolerant?: boolean
  /** Maximum nesting depth (default: 1000) */
  maxDepth?: number
  /** Maximum key length (default: 10000) */
  maxKeyLength?: number
  /** Maximum string length (default: 10000000) */
  maxStringLength?: number
}
