/**
 * Direct AST Parser (Round 2 Optimized)
 *
 * Optimizations applied:
 * - Priority 1: Property lookup reduction (cache this.tokens, this.pos)
 * - Priority 2: Function inlining (parseString, parseBoolean, parseNull)
 * - Priority 3: Monomorphic operations (consistent object shapes)
 * - Priority 4: Branch reduction (simplified control flow)
 *
 * Expected: 1.7-2.3x faster than parse-direct.ts
 */

import { TokenizerOptimized } from './tokenizer-optimized'
import { parseNumber } from './numbers'
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
 * Direct parser with Round 2 optimizations
 */
export class DirectParserOptimized {
  private tokens: Token[]
  private pos: number = 0
  private options: Required<ParserOptions>

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
   * Parse any JSON value
   * Optimized: Inlined parseString, parseBoolean, parseNull
   */
  private parseValue(depth: number): JsonNode {
    if (depth > this.options.maxDepth) {
      throw new ParseError(`Maximum nesting depth exceeded (${this.options.maxDepth})`, 0, [])
    }

    // Cache tokens and pos locally (Priority 1)
    const tokens = this.tokens
    let pos = this.pos

    const token = tokens[pos]

    switch (token.type) {
      case 'lbrace':
        // Write back pos before calling parseObject
        this.pos = pos
        return this.parseObject(depth)

      case 'lbracket':
        // Write back pos before calling parseArray
        this.pos = pos
        return this.parseArray(depth)

      case 'string': {
        // Inlined parseString (Priority 2)
        const t = tokens[pos++]
        this.pos = pos
        // Consistent object shape (Priority 3)
        const result: JsonString = {
          kind: 'string',
          value: t.value!,
          raw: t.raw!,
          start: t.start,
          end: t.end,
        }
        return result
      }

      case 'number': {
        // Write back pos before calling parseNumberNode
        this.pos = pos
        return this.parseNumberNode(token)
      }

      case 'true':
      case 'false': {
        // Inlined parseBoolean (Priority 2)
        const t = tokens[pos++]
        this.pos = pos
        // Consistent object shape (Priority 3)
        const result: JsonNode = {
          kind: 'boolean',
          value: t.type === 'true',
          start: t.start,
          end: t.end,
        }
        return result
      }

      case 'null': {
        // Inlined parseNull (Priority 2)
        const t = tokens[pos++]
        this.pos = pos
        // Consistent object shape (Priority 3)
        const result: JsonNode = {
          kind: 'null',
          value: null,
          start: t.start,
          end: t.end,
        }
        return result
      }

      default:
        throw new ParseError(`Unexpected token: ${token.type}`, token.start, [])
    }
  }

  /**
   * Parse object
   * Optimized: Local variables for tokens and pos
   */
  private parseObject(depth: number): ObjectNode {
    // Cache tokens and pos locally (Priority 1)
    const tokens = this.tokens
    let pos = this.pos

    const startToken = tokens[pos++] // Skip '{'

    const entries: Array<{ key: JsonString; value: JsonNode }> = []

    // Empty object check (Priority 4: early return)
    if (tokens[pos].type === 'rbrace') {
      const endToken = tokens[pos++] // Skip '}'
      this.pos = pos
      // Consistent object shape (Priority 3)
      const result: ObjectNode = {
        kind: 'object',
        entries,
        start: startToken.start,
        end: endToken.end,
      }
      return result
    }

    while (true) {
      // Expect string key
      const keyToken = tokens[pos]
      if (keyToken.type !== 'string') {
        throw new ParseError(`Expected string key, got ${keyToken.type}`, keyToken.start, [])
      }

      // Inline key creation (Priority 2)
      const key: JsonString = {
        kind: 'string',
        value: keyToken.value!,
        raw: keyToken.raw!,
        start: keyToken.start,
        end: keyToken.end,
      }
      pos++

      // Expect colon
      const colonToken = tokens[pos]
      if (colonToken.type !== 'colon') {
        throw new ParseError(
          `Expected colon after key, got ${colonToken.type}`,
          colonToken.start,
          []
        )
      }
      pos++

      // Write back pos before recursive call
      this.pos = pos
      const value = this.parseValue(depth + 1)
      // Read pos back after recursive call
      pos = this.pos

      entries.push({ key, value })

      // Check for comma or end
      const next = tokens[pos]

      // Early return on end (Priority 4)
      if (next.type === 'rbrace') {
        pos++ // Skip '}'
        this.pos = pos
        // Consistent object shape (Priority 3)
        const result: ObjectNode = {
          kind: 'object',
          entries,
          start: startToken.start,
          end: next.end,
        }
        return result
      }

      // Simplified branching (Priority 4)
      if (next.type !== 'comma') {
        throw new ParseError(`Expected comma or }, got ${next.type}`, next.start, [])
      }

      pos++ // Skip ','
    }
  }

  /**
   * Parse array
   * Optimized: Local variables for tokens and pos
   */
  private parseArray(depth: number): ArrayNode {
    // Cache tokens and pos locally (Priority 1)
    const tokens = this.tokens
    let pos = this.pos

    const startToken = tokens[pos++] // Skip '['

    const items: JsonNode[] = []

    // Empty array check (Priority 4: early return)
    if (tokens[pos].type === 'rbracket') {
      const endToken = tokens[pos++] // Skip ']'
      this.pos = pos
      // Consistent object shape (Priority 3)
      const result: ArrayNode = {
        kind: 'array',
        items,
        start: startToken.start,
        end: endToken.end,
      }
      return result
    }

    while (true) {
      // Write back pos before recursive call
      this.pos = pos
      const value = this.parseValue(depth + 1)
      // Read pos back after recursive call
      pos = this.pos

      items.push(value)

      // Check for comma or end
      const next = tokens[pos]

      // Early return on end (Priority 4)
      if (next.type === 'rbracket') {
        pos++ // Skip ']'
        this.pos = pos
        // Consistent object shape (Priority 3)
        const result: ArrayNode = {
          kind: 'array',
          items,
          start: startToken.start,
          end: next.end,
        }
        return result
      }

      // Simplified branching (Priority 4)
      if (next.type !== 'comma') {
        throw new ParseError(`Expected comma or ], got ${next.type}`, next.start, [])
      }

      pos++ // Skip ','
    }
  }

  /**
   * Parse number node
   * Note: Kept as method since it calls parseNumber()
   */
  private parseNumberNode(token: Token): JsonNode {
    this.pos++

    const parsed = parseNumber(token.raw!, this.options.numberMode)

    // Consistent object shape (Priority 3)
    const result: JsonNode = {
      kind: 'number',
      value: parsed.value,
      bigInt: parsed.bigInt,
      decimal: parsed.decimal,
      raw: token.raw!,
      start: token.start,
      end: token.end,
    }
    return result
  }
}

/**
 * Parse JSON into AST (Round 2 optimized parser)
 *
 * @param input - JSON string to parse
 * @param options - Parser configuration options
 * @returns JsonNode AST representing the JSON document
 */
export function parseDirectOptimized(input: string, options?: ParserOptions): JsonNode {
  const parser = new DirectParserOptimized(input, options)
  return parser.parse()
}
