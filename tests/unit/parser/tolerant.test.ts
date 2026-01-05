/**
 * Unit tests for Error Tolerance and Recovery (Week 15)
 */

import { describe, test, expect } from 'vitest'
import { parse } from '../../../src/lib/parser/parse'
import { ParseError } from '../../../src/lib/parser/events'
import type { ObjectNode, ArrayNode } from '../../../src/lib/parser/types'

describe('Error Tolerance and Recovery', () => {
  describe('Trailing commas', () => {
    test('rejects trailing comma in object (strict mode)', () => {
      expect(() => {
        parse('{"a":1,}')
      }).toThrow(ParseError)
    })

    test('accepts trailing comma in object (tolerant mode)', () => {
      const result = parse('{"a":1,}', { tolerant: true })
      const obj = result.ast as ObjectNode

      expect(obj.kind).toBe('object')
      expect(obj.entries).toHaveLength(1)
      expect(obj.entries[0].key.value).toBe('a')
      expect(obj.entries[0].value.value).toBe(1)

      // Check errors
      expect(result.errors).toBeDefined()
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].message).toBe('Trailing comma before }')
      expect(result.errors![0].type).toBe('syntax')
      expect(result.errors![0].recovery).toBe('Skipped trailing comma')
    })

    test('rejects trailing comma in array (strict mode)', () => {
      expect(() => {
        parse('[1,2,]')
      }).toThrow(ParseError)
    })

    test('accepts trailing comma in array (tolerant mode)', () => {
      const result = parse('[1,2,]', { tolerant: true })
      const arr = result.ast as ArrayNode

      expect(arr.kind).toBe('array')
      expect(arr.items).toHaveLength(2)
      expect(arr.items[0].value).toBe(1)
      expect(arr.items[1].value).toBe(2)

      // Check errors
      expect(result.errors).toBeDefined()
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].message).toBe('Trailing comma before ]')
      expect(result.errors![0].recovery).toBe('Skipped trailing comma')
    })

    test('handles multiple trailing commas', () => {
      const result = parse('{"a":1,,"b":2}', { tolerant: true })
      const obj = result.ast as ObjectNode

      expect(obj.kind).toBe('object')
      // Should recover and parse both entries
      expect(obj.entries.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Missing commas', () => {
    test('rejects missing comma in object (strict mode)', () => {
      expect(() => {
        parse('{"a":1 "b":2}')
      }).toThrow(ParseError)
    })

    test('recovers from missing comma in object (tolerant mode)', () => {
      const result = parse('{"a":1 "b":2}', { tolerant: true })
      const obj = result.ast as ObjectNode

      expect(obj.kind).toBe('object')
      expect(obj.entries.length).toBeGreaterThanOrEqual(1)

      // Check errors
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
      const commaError = result.errors!.find(e => e.message.includes('comma'))
      expect(commaError).toBeDefined()
      expect(commaError!.recovery).toBe('Assumed missing comma')
    })

    test('rejects missing comma in array (strict mode)', () => {
      expect(() => {
        parse('[1 2 3]')
      }).toThrow(ParseError)
    })

    test('recovers from missing comma in array (tolerant mode)', () => {
      const result = parse('[1 2 3]', { tolerant: true })
      const arr = result.ast as ArrayNode

      expect(arr.kind).toBe('array')
      // Should recover and parse all elements
      expect(arr.items.length).toBeGreaterThanOrEqual(1)

      // Check errors
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })
  })

  describe('Missing colons', () => {
    test('rejects missing colon (strict mode)', () => {
      expect(() => {
        parse('{"a" 1}')
      }).toThrow(ParseError)
    })

    test('recovers from missing colon (tolerant mode)', () => {
      const result = parse('{"a" 1}', { tolerant: true })
      const obj = result.ast as ObjectNode

      expect(obj.kind).toBe('object')

      // Check errors
      expect(result.errors).toBeDefined()
      const colonError = result.errors!.find(e => e.message.includes('colon'))
      expect(colonError).toBeDefined()
      expect(colonError!.recovery).toBe('Assumed missing colon')
    })
  })

  describe('Error collection', () => {
    test('collects no errors for valid JSON', () => {
      const result = parse('{"a":1,"b":2}', { tolerant: true })

      expect(result.errors).toBeUndefined()
    })

    test('collects multiple errors', () => {
      const result = parse('{"a":1, "b":2,}', { tolerant: true })

      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)

      // Each error should have required fields
      result.errors!.forEach(error => {
        expect(error.message).toBeDefined()
        expect(error.position).toBeGreaterThanOrEqual(0)
        expect(error.path).toBeDefined()
        expect(error.type).toMatch(/syntax|recovery|validation/)
      })
    })

    test('includes path in errors', () => {
      const result = parse('{"user":{"name":"Alice",}}', { tolerant: true })

      expect(result.errors).toBeDefined()
      const trailingCommaError = result.errors!.find(e => e.message.includes('Trailing comma'))
      expect(trailingCommaError).toBeDefined()
      expect(trailingCommaError!.path).toContain('user')
    })
  })

  describe('Complex recovery scenarios', () => {
    test('recovers from nested errors', () => {
      const result = parse('{"a":[1,2,],"b":3,}', { tolerant: true })
      const obj = result.ast as ObjectNode

      expect(obj.kind).toBe('object')
      expect(obj.entries.length).toBeGreaterThanOrEqual(1)

      // Should collect errors from both levels
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    test('continues after recoverable errors', () => {
      const result = parse('{"a":1, "b":2, "c":3,}', { tolerant: true })
      const obj = result.ast as ObjectNode

      // Should parse all entries despite trailing comma
      expect(obj.entries).toHaveLength(3)
    })

    test('preserves data despite errors', () => {
      const result = parse('[1,2,3,]', { tolerant: true })
      const arr = result.ast as ArrayNode

      // All values should be present
      expect(arr.items).toHaveLength(3)
      expect(arr.items[0].value).toBe(1)
      expect(arr.items[1].value).toBe(2)
      expect(arr.items[2].value).toBe(3)
    })
  })

  describe('Strict mode (default)', () => {
    test('throws on any syntax error', () => {
      expect(() => parse('{"a":1,}')).toThrow()
      expect(() => parse('[1,2,]')).toThrow()
      expect(() => parse('{"a":1 "b":2}')).toThrow()
      expect(() => parse('{"a" 1}')).toThrow()
    })

    test('does not collect errors', () => {
      const result = parse('{"a":1}')

      expect(result.errors).toBeUndefined()
    })
  })

  describe('Number mode compatibility', () => {
    test('tolerant mode works with bigint mode', () => {
      const result = parse('{"num":9007199254740992,}', {
        tolerant: true,
        numberMode: 'bigint'
      })
      const obj = result.ast as ObjectNode

      expect(obj.entries[0].value.kind).toBe('number')
      expect(obj.entries[0].value.bigInt).toBe(9007199254740992n)
      expect(result.errors).toBeDefined() // Trailing comma error
    })

    test('tolerant mode works with decimal mode', () => {
      const result = parse('[0.123456789123456789,]', {
        tolerant: true,
        numberMode: 'decimal'
      })
      const arr = result.ast as ArrayNode

      expect(arr.items[0].kind).toBe('number')
      expect(arr.items[0].decimal).toBe('0.123456789123456789')
      expect(result.errors).toBeDefined() // Trailing comma error
    })
  })

  describe('Real-world scenarios', () => {
    test('handles JSON with common mistakes', () => {
      // Common mistake: trailing comma in last property
      const json = `{
        "name": "Alice",
        "age": 30,
        "active": true,
      }`

      const result = parse(json, { tolerant: true })
      const obj = result.ast as ObjectNode

      expect(obj.kind).toBe('object')
      expect(obj.entries).toHaveLength(3)
      expect(result.errors).toBeDefined()
    })

    test('handles arrays with trailing commas', () => {
      const json = `[
        "item1",
        "item2",
        "item3",
      ]`

      const result = parse(json, { tolerant: true })
      const arr = result.ast as ArrayNode

      expect(arr.items).toHaveLength(3)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBe(1)
    })
  })
})
