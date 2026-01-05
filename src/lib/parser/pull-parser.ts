/**
 * Pull Parser for JSON
 *
 * Implements a streaming pull parser that yields events as JSON is parsed.
 * This allows incremental processing without building the full AST upfront.
 */

import { tokenizeOptimized as tokenize } from './tokenizer-optimized'
import { parseNumber } from './numbers'
import type { Token } from './tokens'
import type { JsonNode } from './types'
import type { ParserEvent, ParserOptions } from './events'
import { ParseError } from './events'

/**
 * Pull Parser class
 *
 * Consumes tokens from the tokenizer and yields parser events.
 * Maintains a path stack to track current location in the JSON structure.
 */
export class PullParser {
  private tokens: Token[]
  private pos: number = 0
  private path: string[] = []
  private options: Required<ParserOptions>

  constructor(input: string, options: ParserOptions = {}) {
    this.tokens = Array.from(tokenize(input))
    this.options = {
      numberMode: options.numberMode || 'native',
      maxDepth: options.maxDepth || 1000,
      maxKeyLength: options.maxKeyLength || 10000,
      maxStringLength: options.maxStringLength || 1000000,
    }
  }

  /**
   * Generate parser events
   *
   * Yields events as the JSON document is parsed.
   * Always starts with a value (object, array, or primitive) and ends at EOF.
   */
  *events(): IterableIterator<ParserEvent> {
    // Parse root value
    yield* this.parseValue()

    // Should be at EOF
    const token = this.current()
    if (token.type !== 'eof') {
      throw new ParseError(
        `Unexpected token '${token.type}' after root value`,
        token.start,
        this.getCurrentPath()
      )
    }
  }

  /**
   * Parse any JSON value
   */
  private *parseValue(): IterableIterator<ParserEvent> {
    const token = this.current()

    switch (token.type) {
      case 'lbrace':
        yield* this.parseObject()
        break

      case 'lbracket':
        yield* this.parseArray()
        break

      case 'string':
      case 'number':
      case 'true':
      case 'false':
      case 'null':
        const node = this.parsePrimitive()
        yield { type: 'value', value: node, path: this.getCurrentPath() }
        break

      default:
        throw new ParseError(
          `Unexpected token '${token.type}'`,
          token.start,
          this.getCurrentPath()
        )
    }
  }

  /**
   * Parse an object
   *
   * Yields: startObject, key, value (for each entry), endObject
   */
  private *parseObject(): IterableIterator<ParserEvent> {
    const startToken = this.current()

    // Check depth limit
    if (this.path.length >= this.options.maxDepth) {
      throw new ParseError(
        `Maximum depth ${this.options.maxDepth} exceeded`,
        startToken.start,
        this.getCurrentPath()
      )
    }

    const path = this.getCurrentPath()
    yield { type: 'startObject', path }

    this.consume('lbrace')

    // Empty object
    if (this.current().type === 'rbrace') {
      this.pos++
      yield { type: 'endObject', path }
      return
    }

    while (true) {
      // Parse key
      const keyToken = this.consume('string')

      // Check key length
      if (keyToken.value.length > this.options.maxKeyLength) {
        throw new ParseError(
          `Key exceeds maximum length of ${this.options.maxKeyLength}`,
          keyToken.start,
          path
        )
      }

      yield { type: 'key', value: keyToken.value, path }

      this.path.push('.' + keyToken.value)

      this.consume('colon')

      // Parse value
      yield* this.parseValue()

      this.path.pop()

      // Check for more entries
      const next = this.current()
      if (next.type === 'comma') {
        this.pos++
        continue
      } else if (next.type === 'rbrace') {
        this.pos++
        break
      } else {
        throw new ParseError(
          `Expected ',' or '}', got '${next.type}'`,
          next.start,
          path
        )
      }
    }

    yield { type: 'endObject', path }
  }

  /**
   * Parse an array
   *
   * Yields: startArray, value (for each element), endArray
   */
  private *parseArray(): IterableIterator<ParserEvent> {
    const startToken = this.current()

    // Check depth limit
    if (this.path.length >= this.options.maxDepth) {
      throw new ParseError(
        `Maximum depth ${this.options.maxDepth} exceeded`,
        startToken.start,
        this.getCurrentPath()
      )
    }

    const path = this.getCurrentPath()
    yield { type: 'startArray', path }

    this.consume('lbracket')

    // Empty array
    if (this.current().type === 'rbracket') {
      this.pos++
      yield { type: 'endArray', path }
      return
    }

    let index = 0

    while (true) {
      this.path.push(`[${index}]`)

      yield* this.parseValue()

      this.path.pop()
      index++

      const next = this.current()
      if (next.type === 'comma') {
        this.pos++
        continue
      } else if (next.type === 'rbracket') {
        this.pos++
        break
      } else {
        throw new ParseError(
          `Expected ',' or ']', got '${next.type}'`,
          next.start,
          path
        )
      }
    }

    yield { type: 'endArray', path }
  }

  /**
   * Parse a primitive value (string, number, boolean, null)
   *
   * Returns a JsonNode for the primitive value.
   */
  private parsePrimitive(): JsonNode {
    const token = this.current()
    this.pos++

    switch (token.type) {
      case 'string':
        // Check string length
        if (token.value.length > this.options.maxStringLength) {
          throw new ParseError(
            `String exceeds maximum length of ${this.options.maxStringLength}`,
            token.start,
            this.getCurrentPath()
          )
        }

        return {
          kind: 'string',
          value: token.value,
          raw: token.raw,
          start: token.start,
          end: token.end,
        }

      case 'number':
        const parsed = parseNumber(token.raw, this.options.numberMode)
        return {
          kind: 'number',
          ...parsed,
          start: token.start,
          end: token.end,
        }

      case 'true':
        return { kind: 'boolean', value: true, start: token.start, end: token.end }

      case 'false':
        return { kind: 'boolean', value: false, start: token.start, end: token.end }

      case 'null':
        return { kind: 'null', start: token.start, end: token.end }

      default:
        throw new ParseError(
          `Unexpected primitive token '${token.type}'`,
          token.start,
          this.getCurrentPath()
        )
    }
  }

  /**
   * Get the current token without consuming it
   */
  private current(): Token {
    if (this.pos >= this.tokens.length) {
      const lastToken = this.tokens[this.tokens.length - 1]
      throw new ParseError(
        'Unexpected end of input',
        lastToken?.end || 0,
        this.getCurrentPath()
      )
    }
    return this.tokens[this.pos]
  }

  /**
   * Consume a token of the expected type
   *
   * Throws if the current token doesn't match the expected type.
   */
  private consume(expected: Token['type']): any {
    const token = this.current()
    if (token.type !== expected) {
      throw new ParseError(
        `Expected '${expected}', got '${token.type}'`,
        token.start,
        this.getCurrentPath()
      )
    }
    this.pos++
    return token
  }

  /**
   * Get the current JSON path
   *
   * Returns a JSONPath-like string representing the current location.
   * Example: "$.users[0].name"
   */
  private getCurrentPath(): string {
    return '$' + this.path.join('')
  }
}

/**
 * Factory function to create a pull parser
 *
 * @param input - JSON string to parse
 * @param options - Parser configuration options
 * @returns PullParser instance
 */
export function createPullParser(input: string, options?: ParserOptions): PullParser {
  return new PullParser(input, options)
}
