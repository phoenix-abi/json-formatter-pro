/**
 * Direct AST Parser with Object Pooling (Round 2 Optimization)
 *
 * Uses object pools to reduce GC pressure and improve performance.
 * Reuses node objects across multiple parses instead of creating new ones.
 *
 * Performance target: 1.5-2x faster than parse-direct.ts
 */

import { TokenizerOptimized } from './tokenizer-optimized'
import { parseNumber } from './numbers'
import { getGlobalPools, type NodePools } from './node-pools'
import type {
  JsonNode,
  ObjectNode,
  ArrayNode,
  JsonString,
  ParserOptions,
} from './types'
import type { Token } from './tokens'
import { ParseError } from './events'

/**
 * Direct parser with object pooling
 */
export class DirectParserPooled {
  private tokens: Token[]
  private pos: number = 0
  private options: Required<ParserOptions>
  private pools: NodePools

  constructor(input: string, options: ParserOptions = {}, pools?: NodePools) {
    const tokenizer = new TokenizerOptimized(input)
    this.tokens = Array.from(tokenizer.tokenize())
    this.options = {
      numberMode: options.numberMode || 'native',
      tolerant: options.tolerant || false,
      maxDepth: options.maxDepth || 1000,
      maxKeyLength: options.maxKeyLength || 10000,
      maxStringLength: options.maxStringLength || 10000000,
    }
    // Use provided pools or get global shared pools
    this.pools = pools || getGlobalPools()
  }

  /**
   * Parse JSON into AST using pooled nodes
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
   * Parse object using pooled node
   */
  private parseObject(depth: number): ObjectNode {
    const startToken = this.tokens[this.pos]
    this.pos++ // Skip '{'

    const entries: Array<{ key: JsonString; value: JsonNode }> = []

    // Empty object check
    if (this.tokens[this.pos].type === 'rbrace') {
      const endToken = this.tokens[this.pos]
      this.pos++ // Skip '}'
      // Use pooled node instead of object literal
      return this.pools.acquireObject(entries, startToken.start, endToken.end)
    }

    while (true) {
      // Expect string key
      const keyToken = this.tokens[this.pos]
      if (keyToken.type !== 'string') {
        throw new ParseError(`Expected string key, got ${keyToken.type}`, keyToken.start, [])
      }

      // Use pooled string node for key
      const key = this.pools.acquireString(
        keyToken.value!,
        keyToken.raw!,
        keyToken.start,
        keyToken.end
      )
      this.pos++

      // Expect colon
      const colonToken = this.tokens[this.pos]
      if (colonToken.type !== 'colon') {
        throw new ParseError(
          `Expected colon after key, got ${colonToken.type}`,
          colonToken.start,
          []
        )
      }
      this.pos++

      // Parse value
      const value = this.parseValue(depth + 1)

      entries.push({ key, value })

      // Check for comma or end
      const next = this.tokens[this.pos]

      if (next.type === 'rbrace') {
        this.pos++ // Skip '}'
        // Use pooled node instead of object literal
        return this.pools.acquireObject(entries, startToken.start, next.end)
      } else if (next.type === 'comma') {
        this.pos++ // Skip ','
        continue
      } else {
        throw new ParseError(`Expected comma or }, got ${next.type}`, next.start, [])
      }
    }
  }

  /**
   * Parse array using pooled node
   */
  private parseArray(depth: number): ArrayNode {
    const startToken = this.tokens[this.pos]
    this.pos++ // Skip '['

    const items: JsonNode[] = []

    // Empty array check
    if (this.tokens[this.pos].type === 'rbracket') {
      const endToken = this.tokens[this.pos]
      this.pos++ // Skip ']'
      // Use pooled node instead of object literal
      return this.pools.acquireArray(items, startToken.start, endToken.end)
    }

    while (true) {
      // Parse value
      const value = this.parseValue(depth + 1)
      items.push(value)

      // Check for comma or end
      const next = this.tokens[this.pos]

      if (next.type === 'rbracket') {
        this.pos++ // Skip ']'
        // Use pooled node instead of object literal
        return this.pools.acquireArray(items, startToken.start, next.end)
      } else if (next.type === 'comma') {
        this.pos++ // Skip ','
        continue
      } else {
        throw new ParseError(`Expected comma or ], got ${next.type}`, next.start, [])
      }
    }
  }

  /**
   * Parse string node using pooled node
   */
  private parseString(token: Token): JsonString {
    this.pos++
    // Use pooled node instead of object literal
    return this.pools.acquireString(token.value!, token.raw!, token.start, token.end)
  }

  /**
   * Parse number node using pooled node
   */
  private parseNumberNode(token: Token): JsonNode {
    this.pos++

    const parsed = parseNumber(token.raw!, this.options.numberMode)

    // Use pooled node instead of object literal
    return this.pools.acquireNumber(
      token.raw!,
      token.start,
      token.end,
      parsed.value,
      parsed.bigInt,
      parsed.decimal
    )
  }

  /**
   * Parse boolean node using pooled node
   */
  private parseBoolean(token: Token): JsonNode {
    this.pos++
    const value = token.type === 'true'
    const raw = value ? 'true' : 'false'
    // Use pooled node instead of object literal
    return this.pools.acquireBoolean(value, raw, token.start, token.end)
  }

  /**
   * Parse null node using pooled node
   */
  private parseNull(token: Token): JsonNode {
    this.pos++
    // Use pooled node instead of object literal
    return this.pools.acquireNull('null', token.start, token.end)
  }
}

/**
 * Parse JSON into AST using object pooling (optimized)
 *
 * NOTE: The returned AST uses pooled nodes that may be reused in future parses.
 * If you need to keep the AST, clone it before the next parse() call.
 *
 * @param input - JSON string to parse
 * @param options - Parser configuration options
 * @returns JsonNode AST representing the JSON document
 */
export function parseDirectPooled(input: string, options?: ParserOptions): JsonNode {
  const parser = new DirectParserPooled(input, options)
  const result = parser.parse()

  // Note: We do NOT call pools.releaseAll() here because the caller
  // may still be using the returned AST. The pools will be reused
  // in the next parse() call automatically.

  return result
}
