/**
 * Unit tests for JsonNode types and type guards
 */

import { describe, test, expect } from 'vitest'
import type {
  JsonNode,
  ObjectNode,
  ArrayNode,
  StringNode,
  NumberNode,
  BooleanNode,
  NullNode,
} from '../../../src/lib/parser/types'
import {
  isObjectNode,
  isArrayNode,
  isStringNode,
  isNumberNode,
  isBooleanNode,
  isNullNode,
  isContainerNode,
  isPrimitiveNode,
  isJsonNode,
} from '../../../src/lib/parser/guards'

describe('JsonNode type guards', () => {
  describe('isObjectNode', () => {
    test('identifies object nodes', () => {
      const node: JsonNode = {
        kind: 'object',
        entries: [],
        start: 0,
        end: 2,
      }

      expect(isObjectNode(node)).toBe(true)
      expect(isArrayNode(node)).toBe(false)
      expect(isStringNode(node)).toBe(false)
      expect(isNumberNode(node)).toBe(false)
      expect(isBooleanNode(node)).toBe(false)
      expect(isNullNode(node)).toBe(false)
    })

    test('identifies object nodes with entries', () => {
      const node: ObjectNode = {
        kind: 'object',
        entries: [
          {
            key: { kind: 'string', value: 'name', raw: '"name"', start: 1, end: 7 },
            value: { kind: 'string', value: 'Alice', raw: '"Alice"', start: 8, end: 15 },
          },
        ],
        start: 0,
        end: 16,
      }

      expect(isObjectNode(node)).toBe(true)
    })
  })

  describe('isArrayNode', () => {
    test('identifies array nodes', () => {
      const node: JsonNode = {
        kind: 'array',
        items: [],
        start: 0,
        end: 2,
      }

      expect(isArrayNode(node)).toBe(true)
      expect(isObjectNode(node)).toBe(false)
      expect(isStringNode(node)).toBe(false)
      expect(isNumberNode(node)).toBe(false)
      expect(isBooleanNode(node)).toBe(false)
      expect(isNullNode(node)).toBe(false)
    })

    test('identifies array nodes with items', () => {
      const node: ArrayNode = {
        kind: 'array',
        items: [
          { kind: 'number', value: 1, raw: '1', start: 1, end: 2 },
          { kind: 'number', value: 2, raw: '2', start: 3, end: 4 },
        ],
        start: 0,
        end: 5,
      }

      expect(isArrayNode(node)).toBe(true)
    })
  })

  describe('isStringNode', () => {
    test('identifies string nodes', () => {
      const node: StringNode = {
        kind: 'string',
        value: 'hello',
        raw: '"hello"',
        start: 0,
        end: 7,
      }

      expect(isStringNode(node)).toBe(true)
      expect(isObjectNode(node)).toBe(false)
      expect(isArrayNode(node)).toBe(false)
      expect(isNumberNode(node)).toBe(false)
      expect(isBooleanNode(node)).toBe(false)
      expect(isNullNode(node)).toBe(false)
    })

    test('identifies escaped strings', () => {
      const node: StringNode = {
        kind: 'string',
        value: 'hello\nworld',
        raw: '"hello\\nworld"',
        start: 0,
        end: 14,
      }

      expect(isStringNode(node)).toBe(true)
    })
  })

  describe('isNumberNode', () => {
    test('identifies number nodes with value', () => {
      const node: NumberNode = {
        kind: 'number',
        value: 42,
        raw: '42',
        start: 0,
        end: 2,
      }

      expect(isNumberNode(node)).toBe(true)
      expect(isObjectNode(node)).toBe(false)
      expect(isArrayNode(node)).toBe(false)
      expect(isStringNode(node)).toBe(false)
      expect(isBooleanNode(node)).toBe(false)
      expect(isNullNode(node)).toBe(false)
    })

    test('identifies number nodes with bigInt', () => {
      const node: NumberNode = {
        kind: 'number',
        bigInt: 9007199254740992n, // Beyond Number.MAX_SAFE_INTEGER
        raw: '9007199254740992',
        start: 0,
        end: 16,
      }

      expect(isNumberNode(node)).toBe(true)
    })

    test('identifies number nodes with decimal', () => {
      const node: NumberNode = {
        kind: 'number',
        decimal: '123.456',
        raw: '123.456',
        start: 0,
        end: 7,
      }

      expect(isNumberNode(node)).toBe(true)
    })

    test('identifies number nodes with only raw', () => {
      const node: NumberNode = {
        kind: 'number',
        raw: '1e100',
        start: 0,
        end: 5,
      }

      expect(isNumberNode(node)).toBe(true)
    })
  })

  describe('isBooleanNode', () => {
    test('identifies boolean nodes (true)', () => {
      const node: BooleanNode = {
        kind: 'boolean',
        value: true,
        start: 0,
        end: 4,
      }

      expect(isBooleanNode(node)).toBe(true)
      expect(isObjectNode(node)).toBe(false)
      expect(isArrayNode(node)).toBe(false)
      expect(isStringNode(node)).toBe(false)
      expect(isNumberNode(node)).toBe(false)
      expect(isNullNode(node)).toBe(false)
    })

    test('identifies boolean nodes (false)', () => {
      const node: BooleanNode = {
        kind: 'boolean',
        value: false,
        start: 0,
        end: 5,
      }

      expect(isBooleanNode(node)).toBe(true)
    })
  })

  describe('isNullNode', () => {
    test('identifies null nodes', () => {
      const node: NullNode = {
        kind: 'null',
        start: 0,
        end: 4,
      }

      expect(isNullNode(node)).toBe(true)
      expect(isObjectNode(node)).toBe(false)
      expect(isArrayNode(node)).toBe(false)
      expect(isStringNode(node)).toBe(false)
      expect(isNumberNode(node)).toBe(false)
      expect(isBooleanNode(node)).toBe(false)
    })
  })

  describe('isContainerNode', () => {
    test('identifies object nodes as containers', () => {
      const node: ObjectNode = {
        kind: 'object',
        entries: [],
        start: 0,
        end: 2,
      }

      expect(isContainerNode(node)).toBe(true)
    })

    test('identifies array nodes as containers', () => {
      const node: ArrayNode = {
        kind: 'array',
        items: [],
        start: 0,
        end: 2,
      }

      expect(isContainerNode(node)).toBe(true)
    })

    test('does not identify primitives as containers', () => {
      const stringNode: StringNode = {
        kind: 'string',
        value: 'hello',
        raw: '"hello"',
        start: 0,
        end: 7,
      }

      const numberNode: NumberNode = {
        kind: 'number',
        value: 42,
        raw: '42',
        start: 0,
        end: 2,
      }

      const booleanNode: BooleanNode = {
        kind: 'boolean',
        value: true,
        start: 0,
        end: 4,
      }

      const nullNode: NullNode = {
        kind: 'null',
        start: 0,
        end: 4,
      }

      expect(isContainerNode(stringNode)).toBe(false)
      expect(isContainerNode(numberNode)).toBe(false)
      expect(isContainerNode(booleanNode)).toBe(false)
      expect(isContainerNode(nullNode)).toBe(false)
    })
  })

  describe('isPrimitiveNode', () => {
    test('identifies string nodes as primitives', () => {
      const node: StringNode = {
        kind: 'string',
        value: 'hello',
        raw: '"hello"',
        start: 0,
        end: 7,
      }

      expect(isPrimitiveNode(node)).toBe(true)
    })

    test('identifies number nodes as primitives', () => {
      const node: NumberNode = {
        kind: 'number',
        value: 42,
        raw: '42',
        start: 0,
        end: 2,
      }

      expect(isPrimitiveNode(node)).toBe(true)
    })

    test('identifies boolean nodes as primitives', () => {
      const node: BooleanNode = {
        kind: 'boolean',
        value: true,
        start: 0,
        end: 4,
      }

      expect(isPrimitiveNode(node)).toBe(true)
    })

    test('identifies null nodes as primitives', () => {
      const node: NullNode = {
        kind: 'null',
        start: 0,
        end: 4,
      }

      expect(isPrimitiveNode(node)).toBe(true)
    })

    test('does not identify containers as primitives', () => {
      const objectNode: ObjectNode = {
        kind: 'object',
        entries: [],
        start: 0,
        end: 2,
      }

      const arrayNode: ArrayNode = {
        kind: 'array',
        items: [],
        start: 0,
        end: 2,
      }

      expect(isPrimitiveNode(objectNode)).toBe(false)
      expect(isPrimitiveNode(arrayNode)).toBe(false)
    })
  })

  describe('isJsonNode', () => {
    test('identifies valid object nodes', () => {
      const node = {
        kind: 'object',
        entries: [],
        start: 0,
        end: 2,
      }

      expect(isJsonNode(node)).toBe(true)
    })

    test('identifies valid array nodes', () => {
      const node = {
        kind: 'array',
        items: [],
        start: 0,
        end: 2,
      }

      expect(isJsonNode(node)).toBe(true)
    })

    test('identifies valid primitive nodes', () => {
      const stringNode = {
        kind: 'string',
        value: 'hello',
        raw: '"hello"',
        start: 0,
        end: 7,
      }

      const numberNode = {
        kind: 'number',
        value: 42,
        raw: '42',
        start: 0,
        end: 2,
      }

      const booleanNode = {
        kind: 'boolean',
        value: true,
        start: 0,
        end: 4,
      }

      const nullNode = {
        kind: 'null',
        start: 0,
        end: 4,
      }

      expect(isJsonNode(stringNode)).toBe(true)
      expect(isJsonNode(numberNode)).toBe(true)
      expect(isJsonNode(booleanNode)).toBe(true)
      expect(isJsonNode(nullNode)).toBe(true)
    })

    test('rejects null', () => {
      expect(isJsonNode(null)).toBe(false)
    })

    test('rejects undefined', () => {
      expect(isJsonNode(undefined)).toBe(false)
    })

    test('rejects primitives', () => {
      expect(isJsonNode('string')).toBe(false)
      expect(isJsonNode(42)).toBe(false)
      expect(isJsonNode(true)).toBe(false)
    })

    test('rejects objects without kind', () => {
      const obj = { start: 0, end: 2 }
      expect(isJsonNode(obj)).toBe(false)
    })

    test('rejects objects with invalid kind', () => {
      const obj = { kind: 'invalid', start: 0, end: 2 }
      expect(isJsonNode(obj)).toBe(false)
    })

    test('rejects objects without start', () => {
      const obj = { kind: 'string', end: 2 }
      expect(isJsonNode(obj)).toBe(false)
    })

    test('rejects objects without end', () => {
      const obj = { kind: 'string', start: 0 }
      expect(isJsonNode(obj)).toBe(false)
    })

    test('rejects JsonValue types (native JSON.parse output)', () => {
      // Native types should NOT be identified as JsonNode
      expect(isJsonNode({ name: 'Alice' })).toBe(false)
      expect(isJsonNode([1, 2, 3])).toBe(false)
      expect(isJsonNode('hello')).toBe(false)
      expect(isJsonNode(42)).toBe(false)
      expect(isJsonNode(true)).toBe(false)
      expect(isJsonNode(null)).toBe(false)
    })
  })

  describe('Type compatibility with Integration Contract', () => {
    test('JsonNode can be used as ParsedData', () => {
      // This test verifies that JsonNode types are compatible with the
      // Integration Contract's ParsedData union type
      const objectNode: ObjectNode = {
        kind: 'object',
        entries: [],
        start: 0,
        end: 2,
      }

      const arrayNode: ArrayNode = {
        kind: 'array',
        items: [],
        start: 0,
        end: 2,
      }

      const stringNode: StringNode = {
        kind: 'string',
        value: 'hello',
        raw: '"hello"',
        start: 0,
        end: 7,
      }

      // These should all be valid JsonNode types
      const nodes: JsonNode[] = [objectNode, arrayNode, stringNode]

      nodes.forEach((node) => {
        expect(isJsonNode(node)).toBe(true)
      })
    })
  })
})
