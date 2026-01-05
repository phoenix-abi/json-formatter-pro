/**
 * Unit tests for JSON Tokenizer
 */

import { describe, test, expect } from 'vitest'
import { tokenize, Tokenizer } from '../../../src/lib/parser/tokenizer'
import { TokenizerError } from '../../../src/lib/parser/tokens'
import type { Token } from '../../../src/lib/parser/tokens'

describe('Tokenizer', () => {
  describe('Punctuation', () => {
    test('tokenizes all punctuation', () => {
      const tokens = Array.from(tokenize('{}[],:'))

      expect(tokens).toHaveLength(7) // 6 punctuation + EOF
      expect(tokens[0]).toEqual({ type: 'lbrace', start: 0, end: 1 })
      expect(tokens[1]).toEqual({ type: 'rbrace', start: 1, end: 2 })
      expect(tokens[2]).toEqual({ type: 'lbracket', start: 2, end: 3 })
      expect(tokens[3]).toEqual({ type: 'rbracket', start: 3, end: 4 })
      expect(tokens[4]).toEqual({ type: 'comma', start: 4, end: 5 })
      expect(tokens[5]).toEqual({ type: 'colon', start: 5, end: 6 })
      expect(tokens[6]).toEqual({ type: 'eof', start: 6, end: 6 })
    })

    test('tracks positions correctly', () => {
      const tokens = Array.from(tokenize('{'))

      expect(tokens[0].start).toBe(0)
      expect(tokens[0].end).toBe(1)
    })
  })

  describe('Strings', () => {
    test('tokenizes simple strings', () => {
      const tokens = Array.from(tokenize('"hello world"'))

      expect(tokens[0]).toEqual({
        type: 'string',
        value: 'hello world',
        raw: '"hello world"',
        start: 0,
        end: 13,
      })
    })

    test('tokenizes empty string', () => {
      const tokens = Array.from(tokenize('""'))

      expect(tokens[0]).toEqual({
        type: 'string',
        value: '',
        raw: '""',
        start: 0,
        end: 2,
      })
    })

    test('handles escaped quote', () => {
      const tokens = Array.from(tokenize('"say \\"hello\\""'))

      expect(tokens[0].type).toBe('string')
      expect(tokens[0].value).toBe('say "hello"')
    })

    test('handles escaped backslash', () => {
      const tokens = Array.from(tokenize('"C:\\\\path"'))

      expect(tokens[0].type).toBe('string')
      expect(tokens[0].value).toBe('C:\\path')
    })

    test('handles all escape sequences', () => {
      const tokens = Array.from(tokenize('"\\n\\r\\t\\b\\f\\/"'))

      expect(tokens[0].type).toBe('string')
      expect(tokens[0].value).toBe('\n\r\t\b\f/')
    })

    test('handles unicode escapes', () => {
      const tokens = Array.from(tokenize('"\\u0048\\u0065\\u006c\\u006c\\u006f"'))

      expect(tokens[0].type).toBe('string')
      expect(tokens[0].value).toBe('Hello')
    })

    test('handles unicode emoji', () => {
      const tokens = Array.from(tokenize('"\\ud83d\\ude00"'))

      expect(tokens[0].type).toBe('string')
      expect(tokens[0].value).toBe('😀')
    })

    test('preserves raw string including quotes', () => {
      const tokens = Array.from(tokenize('"test"'))

      expect(tokens[0].raw).toBe('"test"')
    })

    test('throws on unterminated string', () => {
      expect(() => Array.from(tokenize('"unterminated'))).toThrow(TokenizerError)
      expect(() => Array.from(tokenize('"unterminated'))).toThrow('Unterminated string')
    })

    test('throws on invalid escape sequence', () => {
      expect(() => Array.from(tokenize('"\\x"'))).toThrow(TokenizerError)
      expect(() => Array.from(tokenize('"\\x"'))).toThrow('Invalid escape sequence')
    })

    test('throws on unescaped newline', () => {
      expect(() => Array.from(tokenize('"line1\nline2"'))).toThrow(TokenizerError)
      expect(() => Array.from(tokenize('"line1\nline2"'))).toThrow('Unescaped newline')
    })

    test('throws on invalid unicode escape', () => {
      expect(() => Array.from(tokenize('"\\uGGGG"'))).toThrow(TokenizerError)
      expect(() => Array.from(tokenize('"\\uGGGG"'))).toThrow('Invalid unicode escape')
    })

    test('throws on incomplete unicode escape', () => {
      expect(() => Array.from(tokenize('"\\u12"'))).toThrow(TokenizerError)
    })
  })

  describe('Numbers', () => {
    test('tokenizes integers', () => {
      const tokens = Array.from(tokenize('42'))

      expect(tokens[0]).toEqual({
        type: 'number',
        raw: '42',
        start: 0,
        end: 2,
      })
    })

    test('tokenizes zero', () => {
      const tokens = Array.from(tokenize('0'))

      expect(tokens[0]).toEqual({
        type: 'number',
        raw: '0',
        start: 0,
        end: 1,
      })
    })

    test('tokenizes negative numbers', () => {
      const tokens = Array.from(tokenize('-42'))

      expect(tokens[0]).toEqual({
        type: 'number',
        raw: '-42',
        start: 0,
        end: 3,
      })
    })

    test('tokenizes decimals', () => {
      const tokens = Array.from(tokenize('3.14'))

      expect(tokens[0]).toEqual({
        type: 'number',
        raw: '3.14',
        start: 0,
        end: 4,
      })
    })

    test('tokenizes negative decimals', () => {
      const tokens = Array.from(tokenize('-3.14'))

      expect(tokens[0].raw).toBe('-3.14')
    })

    test('tokenizes exponents with positive sign', () => {
      const tokens = Array.from(tokenize('1.5e+10'))

      expect(tokens[0].raw).toBe('1.5e+10')
    })

    test('tokenizes exponents with negative sign', () => {
      const tokens = Array.from(tokenize('1.5e-10'))

      expect(tokens[0].raw).toBe('1.5e-10')
    })

    test('tokenizes exponents without sign', () => {
      const tokens = Array.from(tokenize('1.5e10'))

      expect(tokens[0].raw).toBe('1.5e10')
    })

    test('tokenizes capital E in exponent', () => {
      const tokens = Array.from(tokenize('1E10'))

      expect(tokens[0].raw).toBe('1E10')
    })

    test('tokenizes large numbers', () => {
      const tokens = Array.from(tokenize('9007199254740992'))

      expect(tokens[0].raw).toBe('9007199254740992')
    })

    test('tokenizes multiple numbers', () => {
      const tokens = Array.from(tokenize('42 -3.14 1.5e10'))

      expect(tokens[0].raw).toBe('42')
      expect(tokens[1].raw).toBe('-3.14')
      expect(tokens[2].raw).toBe('1.5e10')
    })

    test('throws on leading zeros', () => {
      expect(() => Array.from(tokenize('042'))).toThrow(TokenizerError)
      expect(() => Array.from(tokenize('042'))).toThrow('leading zeros')
    })

    test('throws on decimal point without digits', () => {
      expect(() => Array.from(tokenize('1.'))).toThrow(TokenizerError)
      expect(() => Array.from(tokenize('1.'))).toThrow('expected digit after decimal')
    })

    test('throws on exponent without digits', () => {
      expect(() => Array.from(tokenize('1e'))).toThrow(TokenizerError)
      expect(() => Array.from(tokenize('1e'))).toThrow('expected digit in exponent')
    })

    test('throws on just minus sign', () => {
      expect(() => Array.from(tokenize('-'))).toThrow(TokenizerError)
    })
  })

  describe('Literals', () => {
    test('tokenizes true', () => {
      const tokens = Array.from(tokenize('true'))

      expect(tokens[0]).toEqual({
        type: 'true',
        start: 0,
        end: 4,
      })
    })

    test('tokenizes false', () => {
      const tokens = Array.from(tokenize('false'))

      expect(tokens[0]).toEqual({
        type: 'false',
        start: 0,
        end: 5,
      })
    })

    test('tokenizes null', () => {
      const tokens = Array.from(tokenize('null'))

      expect(tokens[0]).toEqual({
        type: 'null',
        start: 0,
        end: 4,
      })
    })

    test('tokenizes multiple literals', () => {
      const tokens = Array.from(tokenize('true false null'))

      expect(tokens[0].type).toBe('true')
      expect(tokens[1].type).toBe('false')
      expect(tokens[2].type).toBe('null')
    })

    test('throws on partial literal', () => {
      expect(() => Array.from(tokenize('tru'))).toThrow(TokenizerError)
      expect(() => Array.from(tokenize('fals'))).toThrow(TokenizerError)
      expect(() => Array.from(tokenize('nul'))).toThrow(TokenizerError)
    })

    test('throws on invalid literal', () => {
      expect(() => Array.from(tokenize('True'))).toThrow(TokenizerError)
      expect(() => Array.from(tokenize('FALSE'))).toThrow(TokenizerError)
      expect(() => Array.from(tokenize('NULL'))).toThrow(TokenizerError)
    })
  })

  describe('Whitespace', () => {
    test('skips spaces', () => {
      const tokens = Array.from(tokenize('  {  "a"  :  1  }  '))

      expect(tokens).toHaveLength(6) // { "a" : 1 } EOF
      expect(tokens[0].type).toBe('lbrace')
      expect(tokens[1].type).toBe('string')
      expect(tokens[2].type).toBe('colon')
      expect(tokens[3].type).toBe('number')
      expect(tokens[4].type).toBe('rbrace')
    })

    test('skips tabs', () => {
      const tokens = Array.from(tokenize('\t{\t"a"\t:\t1\t}\t'))

      expect(tokens[0].type).toBe('lbrace')
      expect(tokens[1].type).toBe('string')
    })

    test('skips newlines', () => {
      const tokens = Array.from(tokenize('{\n"a"\n:\n1\n}'))

      expect(tokens[0].type).toBe('lbrace')
      expect(tokens[1].type).toBe('string')
    })

    test('skips carriage returns', () => {
      const tokens = Array.from(tokenize('{\r"a"\r:\r1\r}'))

      expect(tokens[0].type).toBe('lbrace')
      expect(tokens[1].type).toBe('string')
    })

    test('handles mixed whitespace', () => {
      const tokens = Array.from(tokenize(' \t\n\r{ \t\n\r} \t\n\r'))

      expect(tokens[0].type).toBe('lbrace')
      expect(tokens[1].type).toBe('rbrace')
    })
  })

  describe('Complex JSON', () => {
    test('tokenizes simple object', () => {
      const tokens = Array.from(tokenize('{"name":"Alice","age":30}'))

      expect(tokens[0].type).toBe('lbrace')
      expect(tokens[1].type).toBe('string')
      expect(tokens[1].value).toBe('name')
      expect(tokens[2].type).toBe('colon')
      expect(tokens[3].type).toBe('string')
      expect(tokens[3].value).toBe('Alice')
      expect(tokens[4].type).toBe('comma')
      expect(tokens[5].type).toBe('string')
      expect(tokens[5].value).toBe('age')
      expect(tokens[6].type).toBe('colon')
      expect(tokens[7].type).toBe('number')
      expect(tokens[7].raw).toBe('30')
      expect(tokens[8].type).toBe('rbrace')
    })

    test('tokenizes simple array', () => {
      const tokens = Array.from(tokenize('[1,2,3]'))

      expect(tokens[0].type).toBe('lbracket')
      expect(tokens[1].type).toBe('number')
      expect(tokens[2].type).toBe('comma')
      expect(tokens[3].type).toBe('number')
      expect(tokens[4].type).toBe('comma')
      expect(tokens[5].type).toBe('number')
      expect(tokens[6].type).toBe('rbracket')
    })

    test('tokenizes nested structure', () => {
      const tokens = Array.from(tokenize('{"items":[1,2]}'))

      expect(tokens[0].type).toBe('lbrace')
      expect(tokens[1].type).toBe('string')
      expect(tokens[2].type).toBe('colon')
      expect(tokens[3].type).toBe('lbracket')
      expect(tokens[4].type).toBe('number')
      expect(tokens[5].type).toBe('comma')
      expect(tokens[6].type).toBe('number')
      expect(tokens[7].type).toBe('rbracket')
      expect(tokens[8].type).toBe('rbrace')
    })

    test('tokenizes all value types', () => {
      const json = '{"str":"text","num":42,"bool":true,"nil":null,"arr":[],"obj":{}}'
      const tokens = Array.from(tokenize(json))

      // Verify we have all expected token types
      const types = tokens.map(t => t.type)
      expect(types).toContain('string')
      expect(types).toContain('number')
      expect(types).toContain('true')
      expect(types).toContain('null')
      expect(types).toContain('lbracket')
      expect(types).toContain('rbracket')
      expect(types).toContain('lbrace')
      expect(types).toContain('rbrace')
    })
  })

  describe('EOF Token', () => {
    test('always ends with EOF', () => {
      const tokens = Array.from(tokenize('{}'))

      expect(tokens[tokens.length - 1].type).toBe('eof')
    })

    test('EOF on empty input', () => {
      const tokens = Array.from(tokenize(''))

      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe('eof')
    })

    test('EOF on whitespace only', () => {
      const tokens = Array.from(tokenize('   \n\t  '))

      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe('eof')
    })
  })

  describe('Error Handling', () => {
    test('throws TokenizerError for invalid input', () => {
      expect(() => Array.from(tokenize('@'))).toThrow(TokenizerError)
    })

    test('TokenizerError includes position', () => {
      try {
        Array.from(tokenize('@'))
      } catch (err) {
        expect(err).toBeInstanceOf(TokenizerError)
        expect((err as TokenizerError).position).toBe(0)
      }
    })

    test('throws on unexpected character', () => {
      expect(() => Array.from(tokenize('{@}'))).toThrow('Unexpected character')
    })
  })

  describe('Iterator Protocol', () => {
    test('can be consumed with for...of', () => {
      const types: string[] = []

      for (const token of tokenize('{}')) {
        types.push(token.type)
      }

      expect(types).toEqual(['lbrace', 'rbrace', 'eof'])
    })

    test('can be consumed with spread operator', () => {
      const tokens = [...tokenize('[]')]

      expect(tokens).toHaveLength(3) // [ ] EOF
    })

    test('tokenizer can be created multiple times', () => {
      const tokenizer1 = new Tokenizer('{}')
      const tokenizer2 = new Tokenizer('{}')

      const tokens1 = Array.from(tokenizer1.tokenize())
      const tokens2 = Array.from(tokenizer2.tokenize())

      expect(tokens1).toHaveLength(3)
      expect(tokens2).toHaveLength(3)
    })
  })

  describe('Real-world JSON', () => {
    test('tokenizes package.json structure', () => {
      const json = `{
  "name": "test",
  "version": "1.0.0",
  "dependencies": {
    "lib": "^2.0.0"
  }
}`
      const tokens = Array.from(tokenize(json))

      // Should successfully tokenize without errors
      expect(tokens[tokens.length - 1].type).toBe('eof')

      // Verify we got expected structure
      const types = tokens.map(t => t.type)
      expect(types).toContain('lbrace')
      expect(types).toContain('rbrace')
      expect(types).toContain('string')
      expect(types).toContain('colon')
      expect(types).toContain('comma')
    })

    test('tokenizes array of objects', () => {
      const json = '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]'
      const tokens = Array.from(tokenize(json))

      expect(tokens[0].type).toBe('lbracket')
      expect(tokens[tokens.length - 2].type).toBe('rbracket')
      expect(tokens[tokens.length - 1].type).toBe('eof')
    })
  })
})
