/**
 * Direct AST Parser (Optimized)
 *
 * Builds JsonNode AST directly from tokens without intermediate event layer.
 * This eliminates one full traversal compared to parse.ts.
 *
 * Performance target: 3-5x faster than event-based parser
 */

import { TokenizerOptimized } from './tokenizer-optimized'
import { parseNumber } from './numbers'
import type {
  JsonNode,
  ObjectNode,
  ArrayNode,
  StringNode,
  NumberNode,
  BooleanNode,
  NullNode,
  JsonString,
  ParserOptions,
} from './types'
import type { Token } from './tokens'
import { ParseError } from './events'

/**
 * Direct parser - builds AST in single pass
 */
export class DirectParser {
  private tokens: Token[]
  private pos: number = 0
  private options: Required<ParserOptions>
  private keyCache: Map<string, string> = new Map()
  private errors: import('./types').ParseErrorInfo[] = []
  private path: string[] = []

  constructor(input: string, options: ParserOptions = {}) {
    const tokenizer = new TokenizerOptimized(input)
    this.tokens = Array.from(tokenizer.tokenize())
    this.options = {
      numberMode: options.numberMode || 'native',
      tolerant: options.tolerant || false,
      maxDepth: options.maxDepth || 1000,
      maxKeyLength: options.maxKeyLength || 10000,
      maxStringLength: options.maxStringLength || 10000000,
    }
  }

  /**
   * Parse JSON into AST
   */
  parse(): JsonNode {
    const result = this.parseValue(0)

    // Should be at EOF
    if (this.pos < this.tokens.length - 1) {
      const token = this.tokens[this.pos]
      throw new ParseError(
        `Unexpected token after value: ${token.type}`,
        token.start,
        []
      )
    }

    return result
  }

  /**
   * Clear tokens array and caches to allow garbage collection
   * Call this after parse() to free memory
   */
  clearTokens(): void {
    this.tokens = []
    this.pos = 0
    this.keyCache.clear()
  }

  /**
   * Get collected errors (for tolerant mode)
   */
  getErrors(): import('./types').ParseErrorInfo[] {
    return this.errors
  }

  /**
   * Record an error (for tolerant mode)
   */
  private recordError(
    message: string,
    position: number,
    type: 'syntax' | 'recovery' | 'validation' = 'syntax',
    recovery?: string
  ): void {
    this.errors.push({
      message,
      position,
      path: '$' + this.path.join(''),
      type,
      recovery,
    })
  }

  /**
   * Handle error - throw or record depending on tolerant mode
   */
  private handleError(message: string, position: number): void {
    if (this.options.tolerant) {
      this.recordError(message, position)
    } else {
      throw new ParseError(message, position, [])
    }
  }

  /**
   * Intern a string to reduce memory usage for repeated values
   * Particularly useful for object keys which are often repeated
   */
  private internString(value: string): string {
    const cached = this.keyCache.get(value)
    if (cached !== undefined) {
      return cached
    }
    this.keyCache.set(value, value)
    return value
  }

  /**
   * Parse any JSON value
   */
  private parseValue(depth: number): JsonNode {
    if (depth > this.options.maxDepth) {
      throw new ParseError(`Maximum nesting depth exceeded (${this.options.maxDepth})`, 0, [])
    }

    const token = this.tokens[this.pos]

    switch (token.type) {
      case 'lbrace':
        return this.parseObject(depth)
      case 'lbracket':
        return this.parseArray(depth)
      case 'string':
        return this.parseString(token)
      case 'number':
        return this.parseNumberNode(token)
      case 'true':
      case 'false':
        return this.parseBoolean(token)
      case 'null':
        return this.parseNull(token)
      default:
        throw new ParseError(`Unexpected token: ${token.type}`, token.start, [])
    }
  }

  /**
   * Parse object
   */
  private parseObject(depth: number): ObjectNode {
    const startToken = this.tokens[this.pos]
    this.pos++ // Skip '{'

    const entries: Array<{ key: JsonString; value: JsonNode }> = []

    // Empty object check
    if (this.tokens[this.pos].type === 'rbrace') {
      const endToken = this.tokens[this.pos]
      this.pos++ // Skip '}'
      return {
        kind: 'object',
        entries,
        start: startToken.start,
        end: endToken.end,
      }
    }

    while (true) {
      // Expect string key
      const keyToken = this.tokens[this.pos]
      if (keyToken.type !== 'string') {
        // Check for closing brace
        if (keyToken.type === 'rbrace') {
          this.pos++
          return {
            kind: 'object',
            entries,
            start: startToken.start,
            end: keyToken.end,
          }
        }

        if (this.options.tolerant) {
          this.recordError(`Expected string key, got ${keyToken.type}`, keyToken.start, 'syntax', 'Skipped invalid entry')
          this.pos++ // Skip invalid token
          continue
        } else {
          throw new ParseError(`Expected string key, got ${keyToken.type}`, keyToken.start, [])
        }
      }

      const key: JsonString = {
        kind: 'string',
        value: this.internString(keyToken.value!), // Intern keys to reduce memory
        // raw field omitted to save memory (~50% reduction for object keys)
        start: keyToken.start,
        end: keyToken.end,
      }
      this.pos++

      this.path.push('.' + key.value)

      // Expect colon
      const colonToken = this.tokens[this.pos]
      if (colonToken.type !== 'colon') {
        if (this.options.tolerant) {
          this.recordError(
            `Expected colon after key, got ${colonToken.type}`,
            colonToken.start,
            'syntax',
            'Assumed missing colon'
          )
          // Don't skip the token - it might be the value
        } else {
          throw new ParseError(
            `Expected colon after key, got ${colonToken.type}`,
            colonToken.start,
            []
          )
        }
      } else {
        this.pos++
      }

      // Parse value
      const value = this.parseValue(depth + 1)

      entries.push({ key, value })

      this.path.pop()

      // Check for comma or end
      const next = this.tokens[this.pos]

      if (next.type === 'rbrace') {
        this.pos++ // Skip '}'
        return {
          kind: 'object',
          entries,
          start: startToken.start,
          end: next.end,
        }
      } else if (next.type === 'comma') {
        this.pos++ // Skip ','

        // Check if this was a trailing comma (next token is closing brace)
        const afterComma = this.tokens[this.pos]
        if (afterComma.type === 'rbrace') {
          if (this.options.tolerant) {
            this.recordError('Trailing comma before }', next.start, 'syntax', 'Skipped trailing comma')
            this.pos++ // Skip '}'
            return {
              kind: 'object',
              entries,
              start: startToken.start,
              end: afterComma.end,
            }
          } else {
            throw new ParseError('Trailing comma before }', next.start, [])
          }
        }

        continue
      } else {
        // Missing comma
        if (this.options.tolerant) {
          this.recordError(`Expected comma or }, got ${next.type}`, next.start, 'syntax', 'Assumed missing comma')
          // Continue without consuming token - next iteration will try to parse it as key
          continue
        } else {
          throw new ParseError(`Expected comma or }, got ${next.type}`, next.start, [])
        }
      }
    }
  }

  /**
   * Parse array
   */
  private parseArray(depth: number): ArrayNode {
    const startToken = this.tokens[this.pos]
    this.pos++ // Skip '['

    const items: JsonNode[] = []

    // Empty array check
    if (this.tokens[this.pos].type === 'rbracket') {
      const endToken = this.tokens[this.pos]
      this.pos++ // Skip ']'
      return {
        kind: 'array',
        items,
        start: startToken.start,
        end: endToken.end,
      }
    }

    let index = 0
    while (true) {
      this.path.push(`[${index}]`)

      // Parse value
      const value = this.parseValue(depth + 1)
      items.push(value)

      this.path.pop()
      index++

      // Check for comma or end
      const next = this.tokens[this.pos]

      if (next.type === 'rbracket') {
        this.pos++ // Skip ']'
        return {
          kind: 'array',
          items,
          start: startToken.start,
          end: next.end,
        }
      } else if (next.type === 'comma') {
        this.pos++ // Skip ','

        // Check if this was a trailing comma (next token is closing bracket)
        const afterComma = this.tokens[this.pos]
        if (afterComma.type === 'rbracket') {
          if (this.options.tolerant) {
            this.recordError('Trailing comma before ]', next.start, 'syntax', 'Skipped trailing comma')
            this.pos++ // Skip ']'
            return {
              kind: 'array',
              items,
              start: startToken.start,
              end: afterComma.end,
            }
          } else {
            throw new ParseError('Trailing comma before ]', next.start, [])
          }
        }

        continue
      } else {
        // Missing comma
        if (this.options.tolerant) {
          this.recordError(`Expected comma or ], got ${next.type}`, next.start, 'syntax', 'Assumed missing comma')
          // Continue without consuming token - next iteration will try to parse it as value
          continue
        } else {
          throw new ParseError(`Expected comma or ], got ${next.type}`, next.start, [])
        }
      }
    }
  }

  /**
   * Parse string node
   *
   * Note: raw field is omitted to reduce memory overhead (~50% savings).
   * If needed, compute as: input.substring(start, end)
   */
  private parseString(token: Token): StringNode {
    this.pos++
    return {
      kind: 'string',
      value: token.value!,
      // raw field omitted to save memory (optional in StringNode type)
      start: token.start,
      end: token.end,
    }
  }

  /**
   * Parse number node
   *
   * Note: raw field is omitted to reduce memory overhead (~10-15% savings).
   * If needed for lossless display, compute as: input.substring(start, end)
   */
  private parseNumberNode(token: Token): NumberNode {
    this.pos++

    const parsed = parseNumber(token.raw!, this.options.numberMode)

    return {
      kind: 'number',
      value: parsed.value,
      bigInt: parsed.bigInt,
      decimal: parsed.decimal,
      // raw field omitted to save memory (optional in NumberNode type)
      start: token.start,
      end: token.end,
    }
  }

  /**
   * Parse boolean node
   */
  private parseBoolean(token: Token): BooleanNode {
    this.pos++
    return {
      kind: 'boolean',
      value: token.type === 'true',
      start: token.start,
      end: token.end,
    }
  }

  /**
   * Parse null node
   */
  private parseNull(token: Token): NullNode {
    this.pos++
    return {
      kind: 'null',
      start: token.start,
      end: token.end,
    }
  }
}

/**
 * Parse JSON into AST (optimized direct parser)
 *
 * @param input - JSON string to parse
 * @param options - Parser configuration options
 * @returns ParserResult containing AST, input, and errors (if tolerant mode)
 */
export function parseDirect(input: string, options?: ParserOptions): import('./types').ParserResult {
  const parser = new DirectParser(input, options)
  const ast = parser.parse()
  const errors = parser.getErrors()

  // Clear tokens array to allow garbage collection
  // This reduces memory footprint by ~2-3MB per parse
  parser.clearTokens()

  const result: import('./types').ParserResult = { ast, input }

  // Include errors only if there are any (tolerant mode)
  if (errors.length > 0) {
    result.errors = errors
  }

  return result
}
