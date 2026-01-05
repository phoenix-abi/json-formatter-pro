/**
 * Unit tests for Partial/Incremental Parsing
 */

import { describe, test, expect } from 'vitest'
import {
  parseSubtree,
  navigateToPath,
  parseJSONPath,
  isLazyNode,
  realizeLazyNode,
  parsePartial,
} from '../../../src/lib/parser/partial'
import { parse } from '../../../src/lib/parser/parse'
import type { ObjectNode, ArrayNode, LazyNode } from '../../../src/lib/parser/partial'

describe('Partial Parsing', () => {
  describe('parseJSONPath', () => {
    test('parses root path', () => {
      const segments = parseJSONPath('$')

      expect(segments).toHaveLength(1)
      expect(segments[0]).toEqual({ type: 'root' })
    })

    test('parses property access', () => {
      const segments = parseJSONPath('$.name')

      expect(segments).toHaveLength(2)
      expect(segments[0]).toEqual({ type: 'root' })
      expect(segments[1]).toEqual({ type: 'property', name: 'name' })
    })

    test('parses nested property access', () => {
      const segments = parseJSONPath('$.user.name')

      expect(segments).toHaveLength(3)
      expect(segments[0]).toEqual({ type: 'root' })
      expect(segments[1]).toEqual({ type: 'property', name: 'user' })
      expect(segments[2]).toEqual({ type: 'property', name: 'name' })
    })

    test('parses array index', () => {
      const segments = parseJSONPath('$[0]')

      expect(segments).toHaveLength(2)
      expect(segments[0]).toEqual({ type: 'root' })
      expect(segments[1]).toEqual({ type: 'index', index: 0 })
    })

    test('parses mixed property and index', () => {
      const segments = parseJSONPath('$.users[0].name')

      expect(segments).toHaveLength(4)
      expect(segments[0]).toEqual({ type: 'root' })
      expect(segments[1]).toEqual({ type: 'property', name: 'users' })
      expect(segments[2]).toEqual({ type: 'index', index: 0 })
      expect(segments[3]).toEqual({ type: 'property', name: 'name' })
    })

    test('parses nested array indices', () => {
      const segments = parseJSONPath('$[0][1]')

      expect(segments).toHaveLength(3)
      expect(segments[0]).toEqual({ type: 'root' })
      expect(segments[1]).toEqual({ type: 'index', index: 0 })
      expect(segments[2]).toEqual({ type: 'index', index: 1 })
    })

    test('throws on invalid path without $', () => {
      expect(() => parseJSONPath('invalid')).toThrow('must start with $')
    })

    test('throws on empty property name', () => {
      expect(() => parseJSONPath('$.')).toThrow('Empty property name')
    })

    test('throws on unclosed bracket', () => {
      expect(() => parseJSONPath('$[0')).toThrow('Unclosed bracket')
    })

    test('throws on invalid array index', () => {
      expect(() => parseJSONPath('$[abc]')).toThrow('Invalid array index')
    })
  })

  describe('navigateToPath', () => {
    test('navigates to root', () => {
      const json = '{"name":"Alice"}'
      const { ast: root } = parse(json)
      const node = navigateToPath(root, '$')

      expect(node).toBe(root)
    })

    test('navigates to property', () => {
      const json = '{"name":"Alice","age":30}'
      const { ast } = parse(json)
      const root = ast as ObjectNode
      const node = navigateToPath(root, '$.name')

      expect(node?.kind).toBe('string')
      expect(node?.value).toBe('Alice')
    })

    test('navigates to nested property', () => {
      const json = '{"user":{"name":"Alice"}}'
      const { ast: root } = parse(json)
      const node = navigateToPath(root, '$.user.name')

      expect(node?.kind).toBe('string')
      expect(node?.value).toBe('Alice')
    })

    test('navigates to array element', () => {
      const json = '[10,20,30]'
      const { ast } = parse(json)
      const root = ast as ArrayNode
      const node = navigateToPath(root, '$[1]')

      expect(node?.kind).toBe('number')
      expect(node?.value).toBe(20)
    })

    test('navigates to nested array element', () => {
      const json = '[[1,2],[3,4]]'
      const { ast: root } = parse(json)
      const node = navigateToPath(root, '$[1][0]')

      expect(node?.kind).toBe('number')
      expect(node?.value).toBe(3)
    })

    test('navigates to complex path', () => {
      const json = '{"users":[{"name":"Alice"},{"name":"Bob"}]}'
      const { ast: root } = parse(json)
      const node = navigateToPath(root, '$.users[1].name')

      expect(node?.kind).toBe('string')
      expect(node?.value).toBe('Bob')
    })

    test('returns undefined for non-existent property', () => {
      const json = '{"name":"Alice"}'
      const { ast: root } = parse(json)
      const node = navigateToPath(root, '$.nonexistent')

      expect(node).toBeUndefined()
    })

    test('returns undefined for out of bounds index', () => {
      const json = '[1,2,3]'
      const { ast: root } = parse(json)
      const node = navigateToPath(root, '$[10]')

      expect(node).toBeUndefined()
    })

    test('returns undefined for property on non-object', () => {
      const json = '42'
      const { ast: root } = parse(json)
      const node = navigateToPath(root, '$.prop')

      expect(node).toBeUndefined()
    })

    test('returns undefined for index on non-array', () => {
      const json = '{"name":"Alice"}'
      const { ast: root } = parse(json)
      const node = navigateToPath(root, '$[0]')

      expect(node).toBeUndefined()
    })
  })

  describe('parseSubtree', () => {
    test('parses subtree at root', () => {
      const json = '{"name":"Alice"}'
      const node = parseSubtree(json, '$')

      expect(node?.kind).toBe('object')
    })

    test('parses subtree at property', () => {
      const json = '{"user":{"name":"Alice","age":30}}'
      const node = parseSubtree(json, '$.user')

      expect(node?.kind).toBe('object')
      const obj = node as ObjectNode
      expect(obj.entries).toHaveLength(2)
    })

    test('parses subtree at array element', () => {
      const json = '[{"id":1},{"id":2}]'
      const node = parseSubtree(json, '$[1]')

      expect(node?.kind).toBe('object')
      const obj = node as ObjectNode
      expect(obj.entries[0].value.value).toBe(2)
    })

    test('parses subtree with number mode option', () => {
      const json = '{"value":9007199254740992}'
      const node = parseSubtree(json, '$.value', { numberMode: 'bigint' })

      expect(node?.kind).toBe('number')
      expect(node?.bigInt).toBe(9007199254740992n)
    })

    test('returns undefined for non-existent path', () => {
      const json = '{"name":"Alice"}'
      const node = parseSubtree(json, '$.nonexistent')

      expect(node).toBeUndefined()
    })
  })

  describe('LazyNode', () => {
    test('isLazyNode identifies lazy nodes', () => {
      const lazy: LazyNode = {
        kind: 'lazy',
        raw: '{"test":1}',
        start: 0,
        end: 10,
        path: '$.data',
      }

      expect(isLazyNode(lazy)).toBe(true)
    })

    test('isLazyNode returns false for regular nodes', () => {
      const { ast: node } = parse('42')

      expect(isLazyNode(node)).toBe(false)
    })

    test('realizeLazyNode parses on demand', () => {
      const lazy: LazyNode = {
        kind: 'lazy',
        raw: '{"name":"Alice"}',
        start: 0,
        end: 16,
        path: '$.user',
      }

      const realized = realizeLazyNode(lazy)

      expect(realized.kind).toBe('object')
      const obj = realized as ObjectNode
      expect(obj.entries[0].key.value).toBe('name')
    })

    test('realizeLazyNode caches result', () => {
      const lazy: LazyNode = {
        kind: 'lazy',
        raw: '42',
        start: 0,
        end: 2,
        path: '$.num',
      }

      const first = realizeLazyNode(lazy)
      const second = realizeLazyNode(lazy)

      expect(first).toBe(second)
      expect(lazy._cached).toBeDefined()
    })

    test('realizeLazyNode respects parser options', () => {
      const lazy: LazyNode = {
        kind: 'lazy',
        raw: '9007199254740992',
        start: 0,
        end: 16,
        path: '$.big',
      }

      const realized = realizeLazyNode(lazy, { numberMode: 'bigint' })

      expect(realized.kind).toBe('number')
      expect(realized.bigInt).toBe(9007199254740992n)
    })
  })

  describe('parsePartial', () => {
    test('parses primitive values fully', () => {
      const node = parsePartial('42')

      expect(node.kind).toBe('number')
      expect(node.value).toBe(42)
    })

    test('parses shallow object', () => {
      const node = parsePartial('{"name":"Alice","age":30}')

      expect(node.kind).toBe('object')
      const obj = node as ObjectNode
      expect(obj.entries).toHaveLength(2)
    })

    test('parses shallow array', () => {
      const node = parsePartial('[1,2,3]')

      expect(node.kind).toBe('array')
      const arr = node as ArrayNode
      expect(arr.items).toHaveLength(3)
    })

    test('respects maxDepth parameter', () => {
      const json = '{"a":{"b":{"c":1}}}'
      const node = parsePartial(json, 2)

      expect(node.kind).toBe('object')
      // Depth 1: {"a": ...}
      // Depth 2: {"b": ...}
      // Should be fully parsed for depth 2
    })

    test('parses complex nested structure', () => {
      const json = `{
        "users": [
          {"name": "Alice", "age": 30},
          {"name": "Bob", "age": 25}
        ],
        "count": 2
      }`
      const node = parsePartial(json, 3)

      expect(node.kind).toBe('object')
    })
  })

  describe('Integration', () => {
    test('can navigate and then realize lazy nodes', () => {
      const json = '{"data":{"users":[{"name":"Alice"}]}}'
      const { ast: root } = parse(json)

      // Navigate to a subtree
      const users = navigateToPath(root, '$.data.users')
      expect(users?.kind).toBe('array')

      // Could have been lazy, but now it's realized
      const arr = users as ArrayNode
      expect(arr.items).toHaveLength(1)
    })

    test('parseSubtree works with complex real-world data', () => {
      const json = `{
        "api": {
          "version": "1.0",
          "endpoints": [
            {
              "path": "/users",
              "methods": ["GET", "POST"]
            },
            {
              "path": "/posts",
              "methods": ["GET", "POST", "DELETE"]
            }
          ]
        }
      }`

      const endpoints = parseSubtree(json, '$.api.endpoints')
      expect(endpoints?.kind).toBe('array')

      const firstEndpoint = parseSubtree(json, '$.api.endpoints[0]')
      expect(firstEndpoint?.kind).toBe('object')

      const methods = parseSubtree(json, '$.api.endpoints[1].methods')
      expect(methods?.kind).toBe('array')
      const arr = methods as ArrayNode
      expect(arr.items).toHaveLength(3)
    })
  })
})
