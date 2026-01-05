/**
 * Optimized JSON Lexer/Tokenizer
 *
 * Performance optimizations over tokenizer.ts:
 * - Uses charCodeAt() instead of bracket notation (2-3x faster)
 * - Pre-compiled character code constants (eliminates string comparisons)
 * - Array buffer for string building (O(n) instead of O(n²))
 * - Eliminated regex in hot paths (10-50x faster)
 * - Optimized whitespace skipping
 *
 * Target: 5-10x speedup over original tokenizer
 */

import type { Token } from './tokens'
import { TokenizerError } from './tokens'

// Character code constants for fast comparison
const CHAR_LBRACE = 123 // {
const CHAR_RBRACE = 125 // }
const CHAR_LBRACKET = 91 // [
const CHAR_RBRACKET = 93 // ]
const CHAR_COLON = 58 // :
const CHAR_COMMA = 44 // ,
const CHAR_QUOTE = 34 // "
const CHAR_BACKSLASH = 92 // \
const CHAR_SLASH = 47 // /
const CHAR_MINUS = 45 // -
const CHAR_PLUS = 43 // +
const CHAR_DOT = 46 // .
const CHAR_0 = 48 // 0
const CHAR_1 = 49 // 1
const CHAR_9 = 57 // 9
const CHAR_e = 101 // e
const CHAR_E = 69 // E
const CHAR_t = 116 // t
const CHAR_f = 102 // f
const CHAR_n = 110 // n
const CHAR_b = 98 // b
const CHAR_r = 114 // r
const CHAR_u = 117 // u
const CHAR_SPACE = 32 //
const CHAR_TAB = 9 // \t
const CHAR_LF = 10 // \n
const CHAR_CR = 13 // \r

// Escape character mapping for fast lookup
const ESCAPE_MAP: Record<number, string> = {
  [CHAR_QUOTE]: '"',
  [CHAR_BACKSLASH]: '\\',
  [CHAR_SLASH]: '/',
  [CHAR_b]: '\b',
  [CHAR_f]: '\f',
  [CHAR_n]: '\n',
  [CHAR_r]: '\r',
  [CHAR_t]: '\t',
}

/**
 * Optimized streaming JSON tokenizer
 *
 * Uses charCodeAt() and pre-compiled constants for maximum performance.
 */
export class TokenizerOptimized {
  private input: string
  private length: number
  private pos: number = 0
  private line: number = 1
  private column: number = 1

  constructor(input: string) {
    this.input = input
    this.length = input.length
  }

  /**
   * Generate tokens from input
   */
  *tokenize(): IterableIterator<Token> {
    while (this.pos < this.length) {
      this.skipWhitespace()

      if (this.pos >= this.length) break

      const token = this.nextToken()
      if (token) yield token
    }

    yield { type: 'eof', start: this.pos, end: this.pos }
  }

  /**
   * Get the next token from the input
   */
  private nextToken(): Token | null {
    const ch = this.input.charCodeAt(this.pos)
    const start = this.pos

    switch (ch) {
      case CHAR_LBRACE:
        this.pos++
        this.column++
        return { type: 'lbrace', start, end: this.pos }

      case CHAR_RBRACE:
        this.pos++
        this.column++
        return { type: 'rbrace', start, end: this.pos }

      case CHAR_LBRACKET:
        this.pos++
        this.column++
        return { type: 'lbracket', start, end: this.pos }

      case CHAR_RBRACKET:
        this.pos++
        this.column++
        return { type: 'rbracket', start, end: this.pos }

      case CHAR_COLON:
        this.pos++
        this.column++
        return { type: 'colon', start, end: this.pos }

      case CHAR_COMMA:
        this.pos++
        this.column++
        return { type: 'comma', start, end: this.pos }

      case CHAR_QUOTE:
        return this.scanString()

      case CHAR_MINUS:
      case CHAR_0:
      case CHAR_1:
      case CHAR_1 + 1:
      case CHAR_1 + 2:
      case CHAR_1 + 3:
      case CHAR_1 + 4:
      case CHAR_1 + 5:
      case CHAR_1 + 6:
      case CHAR_1 + 7:
      case CHAR_9:
        return this.scanNumber()

      case CHAR_t:
        return this.scanLiteral('true', 'true')

      case CHAR_f:
        return this.scanLiteral('false', 'false')

      case CHAR_n:
        return this.scanLiteral('null', 'null')

      default:
        throw new TokenizerError(
          `Unexpected character '${String.fromCharCode(ch)}'`,
          this.pos,
          this.line,
          this.column
        )
    }
  }

  /**
   * Scan a JSON string with escape handling
   *
   * Optimized with array buffer instead of string concatenation
   */
  private scanString(): Token {
    const start = this.pos
    const startLine = this.line
    const startColumn = this.column

    this.pos++ // Skip opening quote
    this.column++

    // Use array buffer for O(n) string building
    const chars: string[] = []

    while (this.pos < this.length) {
      const ch = this.input.charCodeAt(this.pos)

      if (ch === CHAR_QUOTE) {
        this.pos++ // Skip closing quote
        this.column++
        const raw = this.input.substring(start, this.pos)
        const value = chars.join('')
        return { type: 'string', value, raw, start, end: this.pos }
      }

      if (ch === CHAR_BACKSLASH) {
        this.pos++
        this.column++

        if (this.pos >= this.length) {
          throw new TokenizerError(
            'Unterminated string: unexpected end of input after backslash',
            this.pos,
            this.line,
            this.column
          )
        }

        const escaped = this.input.charCodeAt(this.pos)

        // Fast path: check escape map
        if (ESCAPE_MAP[escaped]) {
          chars.push(ESCAPE_MAP[escaped])
          this.pos++
          this.column++
          continue
        }

        // Unicode escape: \uXXXX
        if (escaped === CHAR_u) {
          this.pos++
          this.column++

          if (this.pos + 3 >= this.length) {
            throw new TokenizerError(
              'Invalid unicode escape: not enough characters',
              this.pos,
              this.line,
              this.column
            )
          }

          // Fast hex parsing without regex
          let codePoint = 0
          for (let i = 0; i < 4; i++) {
            const hexChar = this.input.charCodeAt(this.pos + i)
            let digit: number

            if (hexChar >= CHAR_0 && hexChar <= CHAR_9) {
              digit = hexChar - CHAR_0
            } else if (hexChar >= 65 && hexChar <= 70) {
              // A-F
              digit = hexChar - 65 + 10
            } else if (hexChar >= 97 && hexChar <= 102) {
              // a-f
              digit = hexChar - 97 + 10
            } else {
              throw new TokenizerError(
                `Invalid unicode escape: \\u${this.input.substring(this.pos, this.pos + 4)}`,
                this.pos,
                this.line,
                this.column
              )
            }

            codePoint = (codePoint << 4) | digit
          }

          chars.push(String.fromCharCode(codePoint))
          this.pos += 3 // Will be incremented by 1 below
          this.column += 3
          this.pos++
          this.column++
          continue
        }

        throw new TokenizerError(
          `Invalid escape sequence: \\${String.fromCharCode(escaped)}`,
          this.pos - 1,
          this.line,
          this.column - 1
        )
      } else if (ch === CHAR_LF || ch === CHAR_CR) {
        // JSON spec: unescaped newlines not allowed in strings
        throw new TokenizerError(
          'Unescaped newline in string',
          this.pos,
          this.line,
          this.column
        )
      } else {
        // Fast path: regular character
        chars.push(String.fromCharCode(ch))
        this.pos++
        this.column++
      }
    }

    throw new TokenizerError(
      'Unterminated string',
      start,
      startLine,
      startColumn
    )
  }

  /**
   * Scan a JSON number
   *
   * Optimized with charCodeAt instead of regex
   */
  private scanNumber(): Token {
    const start = this.pos

    // Optional minus
    if (this.input.charCodeAt(this.pos) === CHAR_MINUS) {
      this.pos++
      this.column++
    }

    // Integer part
    if (this.pos >= this.length) {
      throw new TokenizerError(
        'Invalid number: expected digit after minus',
        this.pos,
        this.line,
        this.column
      )
    }

    const firstDigit = this.input.charCodeAt(this.pos)

    if (firstDigit === CHAR_0) {
      // Leading zero: next char must not be a digit
      this.pos++
      this.column++

      if (this.pos < this.length) {
        const next = this.input.charCodeAt(this.pos)
        if (next >= CHAR_0 && next <= CHAR_9) {
          throw new TokenizerError(
            'Invalid number: leading zeros not allowed',
            this.pos,
            this.line,
            this.column
          )
        }
      }
    } else if (firstDigit >= CHAR_1 && firstDigit <= CHAR_9) {
      // Non-zero digit followed by any digits
      this.pos++
      this.column++

      while (this.pos < this.length) {
        const ch = this.input.charCodeAt(this.pos)
        if (ch >= CHAR_0 && ch <= CHAR_9) {
          this.pos++
          this.column++
        } else {
          break
        }
      }
    } else {
      throw new TokenizerError(
        `Invalid number: expected digit but got '${String.fromCharCode(firstDigit)}'`,
        this.pos,
        this.line,
        this.column
      )
    }

    // Fractional part (optional)
    if (this.pos < this.length && this.input.charCodeAt(this.pos) === CHAR_DOT) {
      this.pos++
      this.column++

      if (this.pos >= this.length) {
        throw new TokenizerError(
          'Invalid number: expected digit after decimal point',
          this.pos,
          this.line,
          this.column
        )
      }

      const firstFrac = this.input.charCodeAt(this.pos)
      if (firstFrac < CHAR_0 || firstFrac > CHAR_9) {
        throw new TokenizerError(
          'Invalid number: expected digit after decimal point',
          this.pos,
          this.line,
          this.column
        )
      }

      while (this.pos < this.length) {
        const ch = this.input.charCodeAt(this.pos)
        if (ch >= CHAR_0 && ch <= CHAR_9) {
          this.pos++
          this.column++
        } else {
          break
        }
      }
    }

    // Exponent (optional)
    if (this.pos < this.length) {
      const ch = this.input.charCodeAt(this.pos)
      if (ch === CHAR_e || ch === CHAR_E) {
        this.pos++
        this.column++

        // Optional sign
        if (this.pos < this.length) {
          const sign = this.input.charCodeAt(this.pos)
          if (sign === CHAR_PLUS || sign === CHAR_MINUS) {
            this.pos++
            this.column++
          }
        }

        if (this.pos >= this.length) {
          throw new TokenizerError(
            'Invalid number: expected digit in exponent',
            this.pos,
            this.line,
            this.column
          )
        }

        const firstExp = this.input.charCodeAt(this.pos)
        if (firstExp < CHAR_0 || firstExp > CHAR_9) {
          throw new TokenizerError(
            'Invalid number: expected digit in exponent',
            this.pos,
            this.line,
            this.column
          )
        }

        while (this.pos < this.length) {
          const ch = this.input.charCodeAt(this.pos)
          if (ch >= CHAR_0 && ch <= CHAR_9) {
            this.pos++
            this.column++
          } else {
            break
          }
        }
      }
    }

    const raw = this.input.substring(start, this.pos)
    return { type: 'number', raw, start, end: this.pos }
  }

  /**
   * Scan a literal keyword (true, false, null)
   */
  private scanLiteral(expected: string, type: 'true' | 'false' | 'null'): Token {
    const start = this.pos

    for (let i = 0; i < expected.length; i++) {
      if (this.pos >= this.length || this.input.charCodeAt(this.pos) !== expected.charCodeAt(i)) {
        throw new TokenizerError(
          `Expected '${expected}' but got '${this.input.substring(start, this.pos + 1)}'`,
          start,
          this.line,
          this.column - (this.pos - start)
        )
      }
      this.pos++
      this.column++
    }

    return { type, start, end: this.pos }
  }

  /**
   * Skip whitespace - optimized with charCodeAt
   */
  private skipWhitespace(): void {
    while (this.pos < this.length) {
      const ch = this.input.charCodeAt(this.pos)

      if (ch === CHAR_SPACE || ch === CHAR_TAB || ch === CHAR_CR || ch === CHAR_LF) {
        if (ch === CHAR_LF) {
          this.line++
          this.column = 1
        } else {
          this.column++
        }
        this.pos++
      } else {
        break
      }
    }
  }
}

/**
 * Convenience function to tokenize JSON input with optimized tokenizer
 */
export function tokenizeOptimized(input: string): IterableIterator<Token> {
  const tokenizer = new TokenizerOptimized(input)
  return tokenizer.tokenize()
}
