/**
 * Unit tests for lossless number parsing
 */

import { describe, test, expect } from 'vitest'
import {
  parseNumber,
  isSafeInteger,
  isInteger,
  formatNumber,
  getNumericValue,
  numbersEqual,
  NUMBER_CONSTANTS,
  type ParsedNumber,
  type NumberMode,
} from '../../../src/lib/parser/numbers'

describe('Number parsing', () => {
  describe('parseNumber - native mode', () => {
    test('parses positive integers', () => {
      const result = parseNumber('42', 'native')
      expect(result.value).toBe(42)
      expect(result.raw).toBe('42')
      expect(result.bigInt).toBeUndefined()
      expect(result.decimal).toBeUndefined()
    })

    test('parses negative integers', () => {
      const result = parseNumber('-42', 'native')
      expect(result.value).toBe(-42)
      expect(result.raw).toBe('-42')
    })

    test('parses zero', () => {
      const result = parseNumber('0', 'native')
      expect(result.value).toBe(0)
      expect(result.raw).toBe('0')
    })

    test('parses decimals', () => {
      const result = parseNumber('3.14', 'native')
      expect(result.value).toBe(3.14)
      expect(result.raw).toBe('3.14')
    })

    test('parses negative decimals', () => {
      const result = parseNumber('-3.14', 'native')
      expect(result.value).toBe(-3.14)
      expect(result.raw).toBe('-3.14')
    })

    test('parses scientific notation', () => {
      const result = parseNumber('1.5e10', 'native')
      expect(result.value).toBe(15000000000)
      expect(result.raw).toBe('1.5e10')
    })

    test('parses scientific notation with positive exponent', () => {
      const result = parseNumber('1.5e+10', 'native')
      expect(result.value).toBe(15000000000)
      expect(result.raw).toBe('1.5e+10')
    })

    test('parses scientific notation with negative exponent', () => {
      const result = parseNumber('1.5e-10', 'native')
      expect(result.value).toBe(1.5e-10)
      expect(result.raw).toBe('1.5e-10')
    })

    test('parses capital E in exponent', () => {
      const result = parseNumber('1E10', 'native')
      expect(result.value).toBe(10000000000)
      expect(result.raw).toBe('1E10')
    })

    test('handles very large numbers', () => {
      const result = parseNumber('9007199254740992', 'native')
      expect(result.value).toBe(9007199254740992)
      expect(result.raw).toBe('9007199254740992')
    })

    test('handles very small decimals', () => {
      const result = parseNumber('0.000000001', 'native')
      expect(result.value).toBe(0.000000001)
      expect(result.raw).toBe('0.000000001')
    })
  })

  describe('parseNumber - bigint mode', () => {
    test('parses safe integers as both value and bigInt', () => {
      const result = parseNumber('42', 'bigint')
      expect(result.value).toBe(42)
      expect(result.bigInt).toBe(42n)
      expect(result.raw).toBe('42')
    })

    test('parses large integers beyond safe range', () => {
      const large = '9007199254740992' // 2^53, not safe
      const result = parseNumber(large, 'bigint')

      expect(result.bigInt).toBe(9007199254740992n)
      expect(result.value).toBeUndefined() // Not safe, so no value
      expect(result.raw).toBe(large)
    })

    test('parses very large integers', () => {
      const veryLarge = '12345678901234567890'
      const result = parseNumber(veryLarge, 'bigint')

      expect(result.bigInt).toBe(12345678901234567890n)
      expect(result.raw).toBe(veryLarge)
    })

    test('parses negative large integers', () => {
      const result = parseNumber('-9007199254740992', 'bigint')
      expect(result.bigInt).toBe(-9007199254740992n)
      expect(result.raw).toBe('-9007199254740992')
    })

    test('falls back to native for decimals', () => {
      const result = parseNumber('3.14', 'bigint')
      expect(result.value).toBe(3.14)
      expect(result.bigInt).toBeUndefined()
      expect(result.raw).toBe('3.14')
    })

    test('falls back to native for scientific notation', () => {
      const result = parseNumber('1e10', 'bigint')
      expect(result.value).toBe(10000000000)
      expect(result.bigInt).toBeUndefined()
      expect(result.raw).toBe('1e10')
    })

    test('parses zero as bigint', () => {
      const result = parseNumber('0', 'bigint')
      expect(result.bigInt).toBe(0n)
      expect(result.value).toBe(0)
      expect(result.raw).toBe('0')
    })
  })

  describe('parseNumber - decimal mode', () => {
    test('preserves decimal precision', () => {
      const precise = '0.123456789123456789'
      const result = parseNumber(precise, 'decimal')

      expect(result.decimal).toBe(precise)
      expect(result.value).toBeDefined() // Also has native value
      expect(result.raw).toBe(precise)
    })

    test('preserves integers as decimals', () => {
      const result = parseNumber('42', 'decimal')
      expect(result.decimal).toBe('42')
      expect(result.value).toBe(42)
      expect(result.raw).toBe('42')
    })

    test('preserves scientific notation', () => {
      const result = parseNumber('1.5e10', 'decimal')
      expect(result.decimal).toBe('1.5e10')
      expect(result.value).toBe(15000000000)
      expect(result.raw).toBe('1.5e10')
    })

    test('preserves very long decimals', () => {
      const long = '3.141592653589793238462643383279'
      const result = parseNumber(long, 'decimal')
      expect(result.decimal).toBe(long)
      expect(result.raw).toBe(long)
    })

    test('stores native value even if lossy', () => {
      const precise = '0.123456789123456789123456789'
      const result = parseNumber(precise, 'decimal')

      expect(result.decimal).toBe(precise)
      expect(result.value).toBeDefined()
      // Demonstrate lossiness: string representation of value differs from original
      expect(String(result.value)).not.toBe(precise)
    })
  })

  describe('parseNumber - string mode', () => {
    test('only stores raw string', () => {
      const result = parseNumber('42', 'string')
      expect(result.raw).toBe('42')
      expect(result.value).toBeUndefined()
      expect(result.bigInt).toBeUndefined()
      expect(result.decimal).toBeUndefined()
    })

    test('preserves exact lexeme', () => {
      const result = parseNumber('1.5e+10', 'string')
      expect(result.raw).toBe('1.5e+10')
    })

    test('no parsing overhead', () => {
      const veryLarge = '12345678901234567890123456789012345678901234567890'
      const result = parseNumber(veryLarge, 'string')
      expect(result.raw).toBe(veryLarge)
    })
  })

  describe('isSafeInteger', () => {
    test('returns true for small integers', () => {
      expect(isSafeInteger('0')).toBe(true)
      expect(isSafeInteger('1')).toBe(true)
      expect(isSafeInteger('42')).toBe(true)
      expect(isSafeInteger('-42')).toBe(true)
    })

    test('returns true for max safe integer', () => {
      expect(isSafeInteger('9007199254740991')).toBe(true) // 2^53 - 1
    })

    test('returns true for min safe integer', () => {
      expect(isSafeInteger('-9007199254740991')).toBe(true) // -(2^53 - 1)
    })

    test('returns false for unsafe integers', () => {
      expect(isSafeInteger('9007199254740992')).toBe(false) // 2^53
      expect(isSafeInteger('-9007199254740992')).toBe(false) // -2^53
    })

    test('returns false for decimals', () => {
      expect(isSafeInteger('3.14')).toBe(false)
      expect(isSafeInteger('0.5')).toBe(false)
    })

    test('returns true for scientific notation with safe integer value', () => {
      expect(isSafeInteger('1e10')).toBe(true) // 1e10 = 10000000000, which is a safe integer
      expect(isSafeInteger('1e20')).toBe(false) // 1e20 exceeds safe integer range
    })

    test('returns false for very large numbers', () => {
      expect(isSafeInteger('999999999999999999')).toBe(false)
    })
  })

  describe('isInteger', () => {
    test('returns true for integers', () => {
      expect(isInteger('0')).toBe(true)
      expect(isInteger('42')).toBe(true)
      expect(isInteger('-42')).toBe(true)
      expect(isInteger('9007199254740992')).toBe(true)
    })

    test('returns false for decimals', () => {
      expect(isInteger('3.14')).toBe(false)
      expect(isInteger('0.5')).toBe(false)
    })

    test('returns false for scientific notation', () => {
      expect(isInteger('1e10')).toBe(false)
      expect(isInteger('1E10')).toBe(false)
      expect(isInteger('1.5e10')).toBe(false)
    })
  })

  describe('formatNumber', () => {
    test('returns raw by default', () => {
      const parsed = parseNumber('42', 'native')
      expect(formatNumber(parsed)).toBe('42')
    })

    test('returns raw when preferRaw is true', () => {
      const parsed = parseNumber('3.14', 'native')
      expect(formatNumber(parsed, true)).toBe('3.14')
    })

    test('returns bigInt string when preferRaw is false', () => {
      const parsed = parseNumber('9007199254740992', 'bigint')
      expect(formatNumber(parsed, false)).toBe('9007199254740992')
    })

    test('returns decimal string when preferRaw is false', () => {
      const parsed = parseNumber('0.123456789123456789', 'decimal')
      expect(formatNumber(parsed, false)).toBe('0.123456789123456789')
    })

    test('returns value string when preferRaw is false and no bigInt/decimal', () => {
      const parsed = parseNumber('42', 'native')
      expect(formatNumber(parsed, false)).toBe('42')
    })

    test('returns raw when no other representation', () => {
      const parsed = parseNumber('42', 'string')
      expect(formatNumber(parsed, false)).toBe('42')
    })

    test('prefers bigInt over value', () => {
      const parsed = parseNumber('100', 'bigint')
      expect(formatNumber(parsed, false)).toBe('100')
    })

    test('preserves scientific notation in raw', () => {
      const parsed = parseNumber('1.5e10', 'native')
      expect(formatNumber(parsed, true)).toBe('1.5e10')
      expect(formatNumber(parsed, false)).toBe('15000000000')
    })
  })

  describe('getNumericValue', () => {
    test('returns bigInt when available', () => {
      const parsed = parseNumber('9007199254740992', 'bigint')
      expect(getNumericValue(parsed)).toBe(9007199254740992n)
    })

    test('returns value when bigInt not available', () => {
      const parsed = parseNumber('42', 'native')
      expect(getNumericValue(parsed)).toBe(42)
    })

    test('returns null when only raw available', () => {
      const parsed = parseNumber('42', 'string')
      expect(getNumericValue(parsed)).toBe(null)
    })

    test('prefers bigInt over value', () => {
      const parsed = parseNumber('100', 'bigint')
      expect(getNumericValue(parsed)).toBe(100n)
    })
  })

  describe('numbersEqual', () => {
    test('compares bigInts when both have them', () => {
      const a = parseNumber('9007199254740992', 'bigint')
      const b = parseNumber('9007199254740992', 'bigint')
      expect(numbersEqual(a, b)).toBe(true)
    })

    test('detects different bigInts', () => {
      const a = parseNumber('100', 'bigint')
      const b = parseNumber('200', 'bigint')
      expect(numbersEqual(a, b)).toBe(false)
    })

    test('compares values when both have them', () => {
      const a = parseNumber('3.14', 'native')
      const b = parseNumber('3.14', 'native')
      expect(numbersEqual(a, b)).toBe(true)
    })

    test('detects different values', () => {
      const a = parseNumber('3.14', 'native')
      const b = parseNumber('2.71', 'native')
      expect(numbersEqual(a, b)).toBe(false)
    })

    test('compares raw strings as fallback', () => {
      const a = parseNumber('42', 'string')
      const b = parseNumber('42', 'string')
      expect(numbersEqual(a, b)).toBe(true)
    })

    test('detects different raw strings', () => {
      const a = parseNumber('42', 'string')
      const b = parseNumber('43', 'string')
      expect(numbersEqual(a, b)).toBe(false)
    })
  })

  describe('NUMBER_CONSTANTS', () => {
    test('has correct MAX_SAFE_INTEGER', () => {
      expect(NUMBER_CONSTANTS.MAX_SAFE_INTEGER).toBe(9007199254740991)
      expect(NUMBER_CONSTANTS.MAX_SAFE_INTEGER).toBe(2 ** 53 - 1)
    })

    test('has correct MIN_SAFE_INTEGER', () => {
      expect(NUMBER_CONSTANTS.MIN_SAFE_INTEGER).toBe(-9007199254740991)
      expect(NUMBER_CONSTANTS.MIN_SAFE_INTEGER).toBe(-(2 ** 53 - 1))
    })

    test('has correct MAX_INTEGER', () => {
      expect(NUMBER_CONSTANTS.MAX_INTEGER).toBe(9007199254740992)
      expect(NUMBER_CONSTANTS.MAX_INTEGER).toBe(2 ** 53)
    })

    test('has correct MIN_INTEGER', () => {
      expect(NUMBER_CONSTANTS.MIN_INTEGER).toBe(-9007199254740992)
      expect(NUMBER_CONSTANTS.MIN_INTEGER).toBe(-(2 ** 53))
    })
  })

  describe('Integration with NumberNode', () => {
    test('ParsedNumber can be spread into NumberNode', () => {
      const parsed = parseNumber('42', 'native')

      // Simulate creating a NumberNode from ParsedNumber
      const numberNode = {
        kind: 'number' as const,
        ...parsed,
        start: 0,
        end: 2,
      }

      expect(numberNode.kind).toBe('number')
      expect(numberNode.value).toBe(42)
      expect(numberNode.raw).toBe('42')
      expect(numberNode.start).toBe(0)
      expect(numberNode.end).toBe(2)
    })

    test('BigInt ParsedNumber integrates with NumberNode', () => {
      const parsed = parseNumber('9007199254740992', 'bigint')

      const numberNode = {
        kind: 'number' as const,
        ...parsed,
        start: 10,
        end: 26,
      }

      expect(numberNode.bigInt).toBe(9007199254740992n)
      expect(numberNode.raw).toBe('9007199254740992')
      expect(numberNode.value).toBeUndefined() // Not safe
    })

    test('Decimal ParsedNumber integrates with NumberNode', () => {
      const parsed = parseNumber('0.123456789123456789', 'decimal')

      const numberNode = {
        kind: 'number' as const,
        ...parsed,
        start: 5,
        end: 25,
      }

      expect(numberNode.decimal).toBe('0.123456789123456789')
      expect(numberNode.value).toBeDefined()
      expect(numberNode.raw).toBe('0.123456789123456789')
    })
  })

  describe('Edge cases', () => {
    test('handles default mode', () => {
      const result = parseNumber('42')
      expect(result.value).toBe(42)
      expect(result.raw).toBe('42')
    })

    test('handles all modes with same input', () => {
      const modes: NumberMode[] = ['native', 'bigint', 'decimal', 'string']

      modes.forEach(mode => {
        const result = parseNumber('42', mode)
        expect(result.raw).toBe('42')
      })
    })

    test('preserves exact input string', () => {
      const inputs = ['0', '1.0', '1.00', '1e1', '1E1', '1e+1', '-0']

      inputs.forEach(input => {
        const result = parseNumber(input, 'native')
        expect(result.raw).toBe(input)
      })
    })
  })
})
