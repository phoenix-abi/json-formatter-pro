/**
 * Unit tests for Key Ordering and Stable Iteration (Week 16)
 *
 * Verifies that the parser preserves exact key order from source JSON,
 * including edge cases where native JSON.parse() reorders keys.
 */

import { describe, test, expect } from 'vitest'
import { parse } from '../../../src/lib/parser/parse'
import type { ObjectNode } from '../../../src/lib/parser/types'

describe('Key Ordering and Stable Iteration', () => {
  describe('Basic key order preservation', () => {
    test('preserves alphabetical order', () => {
      const json = '{"apple":1,"banana":2,"cherry":3}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['apple', 'banana', 'cherry'])
    })

    test('preserves reverse alphabetical order', () => {
      const json = '{"z":1,"y":2,"x":3}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['z', 'y', 'x'])
    })

    test('preserves random order', () => {
      const json = '{"third":3,"first":1,"second":2}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['third', 'first', 'second'])
    })

    test('preserves order in nested objects', () => {
      const json = '{"outer":{"z":1,"a":2,"m":3}}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const nested = obj.entries[0].value as ObjectNode
      const keys = nested.entries.map(e => e.key.value)
      expect(keys).toEqual(['z', 'a', 'm'])
    })
  })

  describe('Numeric string keys', () => {
    test('preserves order of numeric string keys (V8 reorders these)', () => {
      // V8 sorts numeric keys before string keys
      // Custom parser should preserve exact source order
      const json = '{"100":1,"2":2,"30":3}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['100', '2', '30'])

      // Compare with native JSON.parse() behavior
      const native = JSON.parse(json)
      const nativeKeys = Object.keys(native)
      // V8 reorders: ['2', '30', '100']
      expect(nativeKeys).toEqual(['2', '30', '100'])

      // Verify our parser is different (preserves source order)
      expect(keys).not.toEqual(nativeKeys)
    })

    test('preserves mixed numeric and string keys', () => {
      const json = '{"name":"Alice","100":"hundred","age":30,"2":"two"}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['name', '100', 'age', '2'])

      // Native reorders numeric keys to front
      const native = JSON.parse(json)
      const nativeKeys = Object.keys(native)
      expect(nativeKeys).toEqual(['2', '100', 'name', 'age'])

      expect(keys).not.toEqual(nativeKeys)
    })

    test('preserves order of array-index-like keys', () => {
      const json = '{"0":"zero","10":"ten","1":"one","2":"two"}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['0', '10', '1', '2'])

      // Native sorts numerically: ['0', '1', '2', '10']
      const native = JSON.parse(json)
      const nativeKeys = Object.keys(native)
      expect(nativeKeys).toEqual(['0', '1', '2', '10'])

      expect(keys).not.toEqual(nativeKeys)
    })

    test('preserves order with negative numeric strings', () => {
      const json = '{"-1":"negative","-100":"very negative","0":"zero","100":"positive"}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['-1', '-100', '0', '100'])
    })

    test('preserves order with decimal numeric strings', () => {
      const json = '{"1.5":"decimal","10":"int","2.5":"decimal2"}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['1.5', '10', '2.5'])
    })
  })

  describe('Unicode and special characters', () => {
    test('preserves order of Unicode keys', () => {
      const json = '{"α":"alpha","β":"beta","γ":"gamma"}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['α', 'β', 'γ'])
    })

    test('preserves order of emoji keys', () => {
      const json = '{"🔥":"fire","🌊":"water","🌍":"earth"}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['🔥', '🌊', '🌍'])
    })

    test('preserves order of CJK keys', () => {
      const json = '{"中":"zh","日":"jp","한":"kr"}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['中', '日', '한'])
    })

    test('preserves order with escaped Unicode', () => {
      const json = '{"\\u0041":"A","\\u0042":"B","\\u0043":"C"}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      // Keys are unescaped: A, B, C
      expect(keys).toEqual(['A', 'B', 'C'])
    })
  })

  describe('Empty and single-key objects', () => {
    test('handles empty object', () => {
      const json = '{}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      expect(obj.entries).toHaveLength(0)
    })

    test('handles single key', () => {
      const json = '{"only":"one"}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['only'])
    })
  })

  describe('Duplicate keys (last value wins)', () => {
    test('handles duplicate keys (preserves all in order)', () => {
      // In JSON, duplicate keys are technically invalid, but parsers
      // typically keep the last value. We preserve all entries in order.
      const json = '{"key":1,"key":2,"key":3}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      // All three entries preserved in order
      expect(obj.entries).toHaveLength(3)
      expect(obj.entries[0].key.value).toBe('key')
      expect(obj.entries[0].value.value).toBe(1)
      expect(obj.entries[1].key.value).toBe('key')
      expect(obj.entries[1].value.value).toBe(2)
      expect(obj.entries[2].key.value).toBe('key')
      expect(obj.entries[2].value.value).toBe(3)
    })
  })

  describe('Deeply nested structures', () => {
    test('preserves order at all nesting levels', () => {
      const json = `{
        "level1_z": {
          "level2_z": {
            "level3_z": 1,
            "level3_a": 2
          },
          "level2_a": 3
        },
        "level1_a": 4
      }`

      const { ast } = parse(json)
      const obj = ast as ObjectNode

      // Level 1 keys
      expect(obj.entries.map(e => e.key.value)).toEqual(['level1_z', 'level1_a'])

      // Level 2 keys
      const level2 = obj.entries[0].value as ObjectNode
      expect(level2.entries.map(e => e.key.value)).toEqual(['level2_z', 'level2_a'])

      // Level 3 keys
      const level3 = level2.entries[0].value as ObjectNode
      expect(level3.entries.map(e => e.key.value)).toEqual(['level3_z', 'level3_a'])
    })
  })

  describe('Large objects', () => {
    test('preserves order in object with 100 keys', () => {
      // Generate keys in specific order: k99, k98, ..., k0
      const keys = Array.from({ length: 100 }, (_, i) => `k${99 - i}`)
      const entries = keys.map((k, i) => `"${k}":${i}`).join(',')
      const json = `{${entries}}`

      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const parsedKeys = obj.entries.map(e => e.key.value)
      expect(parsedKeys).toEqual(keys)
      expect(parsedKeys).toHaveLength(100)
    })

    test('preserves order in object with 1000 keys', () => {
      // Mix of string and numeric keys
      const keys = Array.from({ length: 1000 }, (_, i) => {
        // Alternate between string and numeric-like keys
        return i % 2 === 0 ? `key_${i}` : `${i}`
      })
      const entries = keys.map((k, i) => `"${k}":${i}`).join(',')
      const json = `{${entries}}`

      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const parsedKeys = obj.entries.map(e => e.key.value)
      expect(parsedKeys).toEqual(keys)
      expect(parsedKeys).toHaveLength(1000)
    })
  })

  describe('Iteration stability', () => {
    test('multiple parses produce identical key order', () => {
      const json = '{"z":1,"a":2,"m":3,"b":4,"y":5}'

      // Parse multiple times
      const { ast: ast1 } = parse(json)
      const { ast: ast2 } = parse(json)
      const { ast: ast3 } = parse(json)

      const keys1 = (ast1 as ObjectNode).entries.map(e => e.key.value)
      const keys2 = (ast2 as ObjectNode).entries.map(e => e.key.value)
      const keys3 = (ast3 as ObjectNode).entries.map(e => e.key.value)

      expect(keys1).toEqual(keys2)
      expect(keys2).toEqual(keys3)
      expect(keys1).toEqual(['z', 'a', 'm', 'b', 'y'])
    })

    test('iterator over entries is stable', () => {
      const json = '{"third":3,"first":1,"second":2}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      // Iterate multiple times
      const iteration1 = obj.entries.map(e => e.key.value)
      const iteration2 = obj.entries.map(e => e.key.value)
      const iteration3 = [...obj.entries].map(e => e.key.value)

      expect(iteration1).toEqual(['third', 'first', 'second'])
      expect(iteration2).toEqual(iteration1)
      expect(iteration3).toEqual(iteration1)
    })
  })

  describe('Real-world JSON examples', () => {
    test('preserves package.json script order', () => {
      const json = `{
        "scripts": {
          "build": "vite build",
          "dev": "vite",
          "test": "vitest",
          "lint": "eslint"
        }
      }`

      const { ast } = parse(json)
      const obj = ast as ObjectNode
      const scripts = obj.entries[0].value as ObjectNode

      const keys = scripts.entries.map(e => e.key.value)
      expect(keys).toEqual(['build', 'dev', 'test', 'lint'])
    })

    test('preserves API response field order', () => {
      const json = `{
        "id": 123,
        "name": "Product",
        "price": 99.99,
        "inStock": true,
        "categories": ["electronics"]
      }`

      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['id', 'name', 'price', 'inStock', 'categories'])
    })
  })

  describe('Comparison with native JSON.parse()', () => {
    test('demonstrates difference: numeric keys', () => {
      const json = '{"10":"ten","2":"two","1":"one"}'

      // Custom parser preserves source order
      const { ast: custom } = parse(json)
      const customKeys = (custom as ObjectNode).entries.map(e => e.key.value)
      expect(customKeys).toEqual(['10', '2', '1'])

      // Native parser reorders numeric keys
      const native = JSON.parse(json)
      const nativeKeys = Object.keys(native)
      expect(nativeKeys).toEqual(['1', '2', '10']) // Sorted numerically

      // Verify they're different
      expect(customKeys).not.toEqual(nativeKeys)
    })

    test('demonstrates difference: mixed keys', () => {
      const json = '{"name":"Alice","100":"id","age":30,"0":"index"}'

      // Custom parser preserves source order
      const { ast: custom } = parse(json)
      const customKeys = (custom as ObjectNode).entries.map(e => e.key.value)
      expect(customKeys).toEqual(['name', '100', 'age', '0'])

      // Native parser moves numeric keys to front
      const native = JSON.parse(json)
      const nativeKeys = Object.keys(native)
      expect(nativeKeys).toEqual(['0', '100', 'name', 'age'])

      expect(customKeys).not.toEqual(nativeKeys)
    })
  })

  describe('Edge cases', () => {
    test('handles keys with whitespace', () => {
      const json = '{"key with spaces":"value1","another key":"value2"}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['key with spaces', 'another key'])
    })

    test('handles very long keys', () => {
      const longKey1 = 'a'.repeat(100)
      const longKey2 = 'b'.repeat(100)
      const json = `{"${longKey1}":"val1","${longKey2}":"val2"}`

      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual([longKey1, longKey2])
    })

    test('handles empty string key', () => {
      const json = '{"":"empty","normal":"key"}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['', 'normal'])
    })
  })
})
