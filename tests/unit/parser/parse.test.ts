/**
 * Unit tests for Full AST Parser
 */

import { describe, test, expect } from 'vitest'
import { parse } from '../../../src/lib/parser/parse'
import { ParseError } from '../../../src/lib/parser/events'
import type { ObjectNode, ArrayNode } from '../../../src/lib/parser/types'

describe('parse', () => {
  describe('Primitives', () => {
    test('parses string', () => {
      const { ast } = parse('"hello"')

      expect(ast.kind).toBe('string')
      expect(ast.value).toBe('hello')
      // raw field is omitted for strings to save memory
      expect(ast.raw).toBeUndefined()
    })

    test('parses number', () => {
      const { ast } = parse('42')

      expect(ast.kind).toBe('number')
      expect(ast.value).toBe(42)
      // raw field is omitted for numbers to save memory
      expect(ast.raw).toBeUndefined()
    })

    test('parses boolean true', () => {
      const { ast } = parse('true')

      expect(ast.kind).toBe('boolean')
      expect(ast.value).toBe(true)
    })

    test('parses boolean false', () => {
      const { ast } = parse('false')

      expect(ast.kind).toBe('boolean')
      expect(ast.value).toBe(false)
    })

    test('parses null', () => {
      const { ast } = parse('null')

      expect(ast.kind).toBe('null')
    })
  })

  describe('Objects', () => {
    test('parses empty object', () => {
      const { ast } = parse('{}')
      const obj = ast as ObjectNode

      expect(obj.kind).toBe('object')
      expect(obj.entries).toHaveLength(0)
    })

    test('parses object with one entry', () => {
      const { ast } = parse('{"name":"Alice"}')
      const obj = ast as ObjectNode

      expect(obj.kind).toBe('object')
      expect(obj.entries).toHaveLength(1)
      expect(obj.entries[0].key.value).toBe('name')
      expect(obj.entries[0].value.kind).toBe('string')
      expect(obj.entries[0].value.value).toBe('Alice')
    })

    test('parses object with multiple entries', () => {
      const { ast } = parse('{"name":"Alice","age":30}')
      const obj = ast as ObjectNode

      expect(obj.kind).toBe('object')
      expect(obj.entries).toHaveLength(2)
      expect(obj.entries[0].key.value).toBe('name')
      expect(obj.entries[0].value.value).toBe('Alice')
      expect(obj.entries[1].key.value).toBe('age')
      expect(obj.entries[1].value.value).toBe(30)
    })

    test('preserves key order', () => {
      const { ast } = parse('{"z":1,"a":2,"m":3}')
      const obj = ast as ObjectNode

      expect(obj.entries.map(e => e.key.value)).toEqual(['z', 'a', 'm'])
    })

    test('parses nested object', () => {
      const { ast } = parse('{"user":{"name":"Alice"}}')
      const obj = ast as ObjectNode

      expect(obj.kind).toBe('object')
      expect(obj.entries).toHaveLength(1)
      expect(obj.entries[0].key.value).toBe('user')

      const nested = obj.entries[0].value as ObjectNode
      expect(nested.kind).toBe('object')
      expect(nested.entries).toHaveLength(1)
      expect(nested.entries[0].key.value).toBe('name')
    })

    test('parses deeply nested object', () => {
      const { ast } = parse('{"a":{"b":{"c":{"d":1}}}}')

      let current: any = ast
      expect(current.kind).toBe('object')

      current = current.entries[0].value
      expect(current.kind).toBe('object')

      current = current.entries[0].value
      expect(current.kind).toBe('object')

      current = current.entries[0].value
      expect(current.kind).toBe('object')
      expect(current.entries[0].value.value).toBe(1)
    })
  })

  describe('Arrays', () => {
    test('parses empty array', () => {
      const { ast } = parse('[]')
      const arr = ast as ArrayNode

      expect(arr.kind).toBe('array')
      expect(arr.items).toHaveLength(0)
    })

    test('parses array with one element', () => {
      const { ast } = parse('[42]')
      const arr = ast as ArrayNode

      expect(arr.kind).toBe('array')
      expect(arr.items).toHaveLength(1)
      expect(arr.items[0].kind).toBe('number')
      expect(arr.items[0].value).toBe(42)
    })

    test('parses array with multiple elements', () => {
      const { ast } = parse('[1,2,3]')
      const arr = ast as ArrayNode

      expect(arr.kind).toBe('array')
      expect(arr.items).toHaveLength(3)
      expect(arr.items[0].value).toBe(1)
      expect(arr.items[1].value).toBe(2)
      expect(arr.items[2].value).toBe(3)
    })

    test('parses array with mixed types', () => {
      const { ast } = parse('[1,"hello",true,null]')
      const arr = ast as ArrayNode

      expect(arr.items).toHaveLength(4)
      expect(arr.items[0].kind).toBe('number')
      expect(arr.items[1].kind).toBe('string')
      expect(arr.items[2].kind).toBe('boolean')
      expect(arr.items[3].kind).toBe('null')
    })

    test('parses nested arrays', () => {
      const { ast } = parse('[[1,2],[3,4]]')
      const arr = ast as ArrayNode

      expect(arr.kind).toBe('array')
      expect(arr.items).toHaveLength(2)

      const first = arr.items[0] as ArrayNode
      expect(first.kind).toBe('array')
      expect(first.items).toHaveLength(2)

      const second = arr.items[1] as ArrayNode
      expect(second.kind).toBe('array')
      expect(second.items).toHaveLength(2)
    })
  })

  describe('Complex structures', () => {
    test('parses object with array values', () => {
      const { ast } = parse('{"numbers":[1,2,3],"bools":[true,false]}')
      const obj = ast as ObjectNode

      expect(obj.kind).toBe('object')
      expect(obj.entries).toHaveLength(2)

      const numbers = obj.entries[0].value as ArrayNode
      expect(numbers.kind).toBe('array')
      expect(numbers.items).toHaveLength(3)

      const bools = obj.entries[1].value as ArrayNode
      expect(bools.kind).toBe('array')
      expect(bools.items).toHaveLength(2)
    })

    test('parses array of objects', () => {
      const { ast } = parse('[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]')
      const arr = ast as ArrayNode

      expect(arr.kind).toBe('array')
      expect(arr.items).toHaveLength(2)

      const first = arr.items[0] as ObjectNode
      expect(first.kind).toBe('object')
      expect(first.entries).toHaveLength(2)

      const second = arr.items[1] as ObjectNode
      expect(second.kind).toBe('object')
      expect(second.entries).toHaveLength(2)
    })

    test('parses mixed nested structure', () => {
      const json = `{
        "users": [
          {"name": "Alice", "tags": ["admin", "user"]},
          {"name": "Bob", "tags": ["user"]}
        ],
        "count": 2
      }`
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      expect(obj.kind).toBe('object')
      expect(obj.entries).toHaveLength(2)

      const users = obj.entries[0].value as ArrayNode
      expect(users.items).toHaveLength(2)

      const firstUser = users.items[0] as ObjectNode
      const tags = firstUser.entries[1].value as ArrayNode
      expect(tags.items).toHaveLength(2)
    })
  })

  describe('Number modes', () => {
    test('parses large integer in bigint mode', () => {
      const { ast } = parse('9007199254740992', { numberMode: 'bigint' })

      expect(ast.kind).toBe('number')
      expect(ast.bigInt).toBe(9007199254740992n)
    })

    test('parses decimal in decimal mode', () => {
      const { ast } = parse('0.123456789123456789', { numberMode: 'decimal' })

      expect(ast.kind).toBe('number')
      expect(ast.decimal).toBe('0.123456789123456789')
    })

    test('parses number in string mode', () => {
      const { ast } = parse('42', { numberMode: 'string' })

      expect(ast.kind).toBe('number')
      expect(ast.value).toBeUndefined()
      // raw field is omitted to save memory, compute on-demand from input
      expect(ast.raw).toBeUndefined()
    })
  })

  describe('Key order preservation', () => {
    test('preserves insertion order', () => {
      const json = '{"third":3,"first":1,"second":2}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['third', 'first', 'second'])
    })

    test('preserves order in nested objects', () => {
      const json = '{"outer":{"z":1,"a":2}}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const nested = obj.entries[0].value as ObjectNode
      const keys = nested.entries.map(e => e.key.value)
      expect(keys).toEqual(['z', 'a'])
    })

    test('preserves numeric string keys order', () => {
      // Note: Native JSON.parse would reorder these, but our parser should not
      const json = '{"10":1,"2":2,"1":3}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const keys = obj.entries.map(e => e.key.value)
      expect(keys).toEqual(['10', '2', '1'])
    })
  })

  describe('Error handling', () => {
    test('throws on invalid JSON', () => {
      expect(() => parse('invalid')).toThrow()
    })

    test('throws on trailing comma', () => {
      expect(() => parse('{"a":1,}')).toThrow(ParseError)
    })

    test('throws on missing comma', () => {
      expect(() => parse('{"a":1 "b":2}')).toThrow(ParseError)
    })

    test('throws on extra data', () => {
      expect(() => parse('42 "extra"')).toThrow(ParseError)
    })
  })

  describe('Real-world JSON', () => {
    test('parses package.json structure', () => {
      const json = `{
  "name": "test-package",
  "version": "1.0.0",
  "description": "A test package",
  "main": "index.js",
  "scripts": {
    "test": "vitest",
    "build": "tsc"
  },
  "dependencies": {
    "lib1": "^1.0.0",
    "lib2": "~2.0.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}`
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      expect(obj.kind).toBe('object')
      expect(obj.entries.length).toBeGreaterThan(0)

      // Find scripts object
      const scripts = obj.entries.find(e => e.key.value === 'scripts')
      expect(scripts).toBeDefined()
      expect(scripts!.value.kind).toBe('object')
    })

    test('parses API response structure', () => {
      const json = `{
  "status": 200,
  "data": {
    "users": [
      {"id": 1, "name": "Alice", "active": true},
      {"id": 2, "name": "Bob", "active": false}
    ],
    "total": 2,
    "page": 1
  },
  "timestamp": "2025-01-01T00:00:00Z"
}`
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      expect(obj.kind).toBe('object')

      const data = obj.entries.find(e => e.key.value === 'data')!.value as ObjectNode
      const users = data.entries.find(e => e.key.value === 'users')!.value as ArrayNode

      expect(users.items).toHaveLength(2)
    })
  })
})
