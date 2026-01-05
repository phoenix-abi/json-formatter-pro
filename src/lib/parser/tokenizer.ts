/**
 * JSON Lexer/Tokenizer
 *
 * Converts JSON text into a stream of tokens.
 * Implements RFC 8259 compliant JSON tokenization with:
 * - Proper string escape handling
 * - Unicode escape sequences (\uXXXX)
 * - Number format validation
 * - Position tracking for error reporting
 */

import type { Token } from './tokens'
import { TokenizerError } from './tokens'

/**
 * Streaming JSON tokenizer
 *
 * Converts input string into an iterator of tokens.
 * Tracks line and column positions for error reporting.
 */
export class Tokenizer {
  private input: string
  private pos: number = 0
  private line: number = 1
  private column: number = 1

  constructor(input: string) {
    this.input = input
  }

  /**
   * Generate tokens from input
   *
   * Returns an iterator that yields tokens one at a time.
   * Always ends with an 'eof' token.
   */
  *tokenize(): IterableIterator<Token> {
    while (this.pos < this.input.length) {
      this.skipWhitespace()

      if (this.pos >= this.input.length) break

      const token = this.nextToken()
      if (token) yield token
    }

    yield { type: 'eof', start: this.pos, end: this.pos }
  }

  /**
   * Get the next token from the input
   */
  private nextToken(): Token | null {
    const ch = this.input[this.pos]
    const start = this.pos

    switch (ch) {
      case '{':
        this.pos++
        this.column++
        return { type: 'lbrace', start, end: this.pos }

      case '}':
        this.pos++
        this.column++
        return { type: 'rbrace', start, end: this.pos }

      case '[':
        this.pos++
        this.column++
        return { type: 'lbracket', start, end: this.pos }

      case ']':
        this.pos++
        this.column++
        return { type: 'rbracket', start, end: this.pos }

      case ':':
        this.pos++
        this.column++
        return { type: 'colon', start, end: this.pos }

      case ',':
        this.pos++
        this.column++
        return { type: 'comma', start, end: this.pos }

      case '"':
        return this.scanString()

      case '-':
      case '0': case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8': case '9':
        return this.scanNumber()

      case 't':
        return this.scanLiteral('true', 'true')

      case 'f':
        return this.scanLiteral('false', 'false')

      case 'n':
        return this.scanLiteral('null', 'null')

      default:
        throw new TokenizerError(
          `Unexpected character '${ch}'`,
          this.pos,
          this.line,
          this.column
        )
    }
  }

  /**
   * Scan a JSON string with escape handling
   */
  private scanString(): Token {
    const start = this.pos
    const startLine = this.line
    const startColumn = this.column

    this.pos++ // Skip opening quote
    this.column++

    let value = ''

    while (this.pos < this.input.length) {
      const ch = this.input[this.pos]

      if (ch === '"') {
        this.pos++ // Skip closing quote
        this.column++
        const raw = this.input.substring(start, this.pos)
        return { type: 'string', value, raw, start, end: this.pos }
      }

      if (ch === '\\') {
        this.pos++
        this.column++

        if (this.pos >= this.input.length) {
          throw new TokenizerError(
            'Unterminated string: unexpected end of input after backslash',
            this.pos,
            this.line,
            this.column
          )
        }

        const escaped = this.input[this.pos]

        switch (escaped) {
          case '"':
            value += '"'
            break
          case '\\':
            value += '\\'
            break
          case '/':
            value += '/'
            break
          case 'b':
            value += '\b'
            break
          case 'f':
            value += '\f'
            break
          case 'n':
            value += '\n'
            break
          case 'r':
            value += '\r'
            break
          case 't':
            value += '\t'
            break
          case 'u':
            // Unicode escape: \uXXXX
            this.pos++
            this.column++

            if (this.pos + 3 >= this.input.length) {
              throw new TokenizerError(
                'Invalid unicode escape: not enough characters',
                this.pos,
                this.line,
                this.column
              )
            }

            const hex = this.input.substring(this.pos, this.pos + 4)

            if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
              throw new TokenizerError(
                `Invalid unicode escape: \\u${hex}`,
                this.pos,
                this.line,
                this.column
              )
            }

            value += String.fromCharCode(parseInt(hex, 16))
            this.pos += 3 // Will be incremented by 1 below
            this.column += 3
            break

          default:
            throw new TokenizerError(
              `Invalid escape sequence: \\${escaped}`,
              this.pos - 1,
              this.line,
              this.column - 1
            )
        }

        this.pos++
        this.column++
      } else if (ch === '\n' || ch === '\r') {
        // JSON spec: unescaped newlines not allowed in strings
        throw new TokenizerError(
          'Unescaped newline in string',
          this.pos,
          this.line,
          this.column
        )
      } else {
        value += ch
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
   * Follows RFC 8259 grammar:
   *   number = [ minus ] int [ frac ] [ exp ]
   *   int = zero / ( digit1-9 *DIGIT )
   *   frac = decimal-point 1*DIGIT
   *   exp = e [ minus / plus ] 1*DIGIT
   */
  private scanNumber(): Token {
    const start = this.pos

    // Optional minus
    if (this.input[this.pos] === '-') {
      this.pos++
      this.column++
    }

    // Integer part
    if (this.pos >= this.input.length) {
      throw new TokenizerError(
        'Invalid number: expected digit after minus',
        this.pos,
        this.line,
        this.column
      )
    }

    if (this.input[this.pos] === '0') {
      // Leading zero: next char must not be a digit
      this.pos++
      this.column++

      if (this.pos < this.input.length && /[0-9]/.test(this.input[this.pos])) {
        throw new TokenizerError(
          'Invalid number: leading zeros not allowed',
          this.pos,
          this.line,
          this.column
        )
      }
    } else if (/[1-9]/.test(this.input[this.pos])) {
      // Non-zero digit followed by any digits
      this.pos++
      this.column++

      while (this.pos < this.input.length && /[0-9]/.test(this.input[this.pos])) {
        this.pos++
        this.column++
      }
    } else {
      throw new TokenizerError(
        `Invalid number: expected digit but got '${this.input[this.pos]}'`,
        this.pos,
        this.line,
        this.column
      )
    }

    // Fractional part (optional)
    if (this.pos < this.input.length && this.input[this.pos] === '.') {
      this.pos++
      this.column++

      if (this.pos >= this.input.length || !/[0-9]/.test(this.input[this.pos])) {
        throw new TokenizerError(
          'Invalid number: expected digit after decimal point',
          this.pos,
          this.line,
          this.column
        )
      }

      while (this.pos < this.input.length && /[0-9]/.test(this.input[this.pos])) {
        this.pos++
        this.column++
      }
    }

    // Exponent (optional)
    if (this.pos < this.input.length &&
        (this.input[this.pos] === 'e' || this.input[this.pos] === 'E')) {
      this.pos++
      this.column++

      // Optional sign
      if (this.pos < this.input.length &&
          (this.input[this.pos] === '+' || this.input[this.pos] === '-')) {
        this.pos++
        this.column++
      }

      if (this.pos >= this.input.length || !/[0-9]/.test(this.input[this.pos])) {
        throw new TokenizerError(
          'Invalid number: expected digit in exponent',
          this.pos,
          this.line,
          this.column
        )
      }

      while (this.pos < this.input.length && /[0-9]/.test(this.input[this.pos])) {
        this.pos++
        this.column++
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
      if (this.pos >= this.input.length || this.input[this.pos] !== expected[i]) {
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
   * Skip whitespace and track line/column positions
   */
  private skipWhitespace(): void {
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos]

      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        if (ch === '\n') {
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
 * Convenience function to tokenize JSON input
 *
 * @param input - JSON string to tokenize
 * @returns Iterator of tokens
 */
export function tokenize(input: string): IterableIterator<Token> {
  const tokenizer = new Tokenizer(input)
  return tokenizer.tokenize()
}
