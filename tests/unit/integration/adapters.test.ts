import { describe, test, expect } from 'vitest'
import {
  JsonValueAdapter,
  JsonNodeAdapter,
} from '../../../src/lib/integration/adapters'
import type { JsonValue } from '../../../src/lib/integration/types'
import type {
  JsonNode,
  StringNode,
  NumberNode,
  BooleanNode,
  NullNode,
  ObjectNode,
  ArrayNode,
} from '../../../src/lib/parser/types'

describe('JsonValueAdapter', () => {
  const adapter = new JsonValueAdapter()

  describe('Primitives', () => {
    test('handles string metadata', () => {
      const data: JsonValue = 'hello'
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('string')
      expect(meta.hasChildren).toBe(false)
      expect(meta.childCount).toBe(0)
      expect(meta.displayValue).toBe('hello')
    })

    test('handles number metadata', () => {
      const data: JsonValue = 42
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('number')
      expect(meta.hasChildren).toBe(false)
      expect(meta.childCount).toBe(0)
      expect(meta.displayValue).toBe('42')
    })

    test('handles boolean metadata (true)', () => {
      const data: JsonValue = true
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('boolean')
      expect(meta.hasChildren).toBe(false)
      expect(meta.displayValue).toBe('true')
    })

    test('handles boolean metadata (false)', () => {
      const data: JsonValue = false
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('boolean')
      expect(meta.displayValue).toBe('false')
    })

    test('handles null metadata', () => {
      const data: JsonValue = null
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('null')
      expect(meta.hasChildren).toBe(false)
      expect(meta.displayValue).toBe('null')
    })

    test('primitives have no children', () => {
      const primitives: JsonValue[] = ['hello', 42, true, false, null]

      for (const primitive of primitives) {
        const children = Array.from(adapter.getChildren(primitive))
        expect(children).toHaveLength(0)
      }
    })

    test('getChild returns undefined for primitives', () => {
      expect(adapter.getChild('hello', 0)).toBeUndefined()
      expect(adapter.getChild(42, 'key')).toBeUndefined()
      expect(adapter.getChild(true, 0)).toBeUndefined()
    })
  })

  describe('Objects', () => {
    test('handles object metadata', () => {
      const data: JsonValue = { a: 1, b: 2, c: 3 }
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('object')
      expect(meta.hasChildren).toBe(true)
      expect(meta.childCount).toBe(3)
      expect(meta.displayValue).toBeNull()
    })

    test('handles empty object', () => {
      const data: JsonValue = {}
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('object')
      expect(meta.hasChildren).toBe(true)
      expect(meta.childCount).toBe(0)
    })

    test('iterates object children in order', () => {
      const data: JsonValue = { a: 1, b: 2, c: 3 }
      const children = Array.from(adapter.getChildren(data))

      expect(children).toHaveLength(3)

      expect(children[0].key).toBe('a')
      expect(children[0].value).toBe(1)
      expect(children[0].index).toBe(0)

      expect(children[1].key).toBe('b')
      expect(children[1].value).toBe(2)
      expect(children[1].index).toBe(1)

      expect(children[2].key).toBe('c')
      expect(children[2].value).toBe(3)
      expect(children[2].index).toBe(2)
    })

    test('getChild retrieves by key', () => {
      const data: JsonValue = { name: 'Alice', age: 30, active: true }

      expect(adapter.getChild(data, 'name')).toBe('Alice')
      expect(adapter.getChild(data, 'age')).toBe(30)
      expect(adapter.getChild(data, 'active')).toBe(true)
    })

    test('getChild returns undefined for missing key', () => {
      const data: JsonValue = { a: 1 }
      expect(adapter.getChild(data, 'missing')).toBeUndefined()
    })

    test('getChild returns undefined for numeric index on object', () => {
      const data: JsonValue = { a: 1 }
      expect(adapter.getChild(data, 0)).toBeUndefined()
    })

    test('handles nested objects', () => {
      const data: JsonValue = {
        user: { name: 'Alice', age: 30 },
        settings: { theme: 'dark' },
      }

      const children = Array.from(adapter.getChildren(data))
      expect(children).toHaveLength(2)

      const userChild = adapter.getChild(data, 'user')
      expect(userChild).toEqual({ name: 'Alice', age: 30 })

      const userMeta = adapter.getMetadata(userChild!)
      expect(userMeta.type).toBe('object')
      expect(userMeta.childCount).toBe(2)
    })
  })

  describe('Arrays', () => {
    test('handles array metadata', () => {
      const data: JsonValue = [10, 20, 30]
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('array')
      expect(meta.hasChildren).toBe(true)
      expect(meta.childCount).toBe(3)
      expect(meta.displayValue).toBeNull()
    })

    test('handles empty array', () => {
      const data: JsonValue = []
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('array')
      expect(meta.hasChildren).toBe(true)
      expect(meta.childCount).toBe(0)
    })

    test('iterates array children', () => {
      const data: JsonValue = [10, 20, 30]
      const children = Array.from(adapter.getChildren(data))

      expect(children).toHaveLength(3)

      expect(children[0].key).toBeNull()
      expect(children[0].value).toBe(10)
      expect(children[0].index).toBe(0)

      expect(children[1].key).toBeNull()
      expect(children[1].value).toBe(20)
      expect(children[1].index).toBe(1)

      expect(children[2].key).toBeNull()
      expect(children[2].value).toBe(30)
      expect(children[2].index).toBe(2)
    })

    test('getChild retrieves by index', () => {
      const data: JsonValue = ['a', 'b', 'c']

      expect(adapter.getChild(data, 0)).toBe('a')
      expect(adapter.getChild(data, 1)).toBe('b')
      expect(adapter.getChild(data, 2)).toBe('c')
    })

    test('getChild returns undefined for out-of-bounds index', () => {
      const data: JsonValue = [1, 2, 3]

      expect(adapter.getChild(data, -1)).toBeUndefined()
      expect(adapter.getChild(data, 10)).toBeUndefined()
    })

    test('getChild returns undefined for string key on array', () => {
      const data: JsonValue = [1, 2, 3]
      expect(adapter.getChild(data, 'key')).toBeUndefined()
    })

    test('handles nested arrays', () => {
      const data: JsonValue = [
        [1, 2],
        [3, 4],
      ]

      const children = Array.from(adapter.getChildren(data))
      expect(children).toHaveLength(2)

      const firstChild = adapter.getChild(data, 0)
      expect(firstChild).toEqual([1, 2])

      const firstChildMeta = adapter.getMetadata(firstChild!)
      expect(firstChildMeta.type).toBe('array')
      expect(firstChildMeta.childCount).toBe(2)
    })
  })

  describe('Complex structures', () => {
    test('handles mixed nested structure', () => {
      const data: JsonValue = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
        settings: {
          theme: 'dark',
          notifications: true,
        },
        count: 42,
      }

      const meta = adapter.getMetadata(data)
      expect(meta.type).toBe('object')
      expect(meta.childCount).toBe(3)

      const children = Array.from(adapter.getChildren(data))
      expect(children).toHaveLength(3)

      // Check users array
      const users = adapter.getChild(data, 'users')
      const usersMeta = adapter.getMetadata(users!)
      expect(usersMeta.type).toBe('array')
      expect(usersMeta.childCount).toBe(2)

      // Check first user
      const firstUser = adapter.getChild(users!, 0)
      const firstUserMeta = adapter.getMetadata(firstUser!)
      expect(firstUserMeta.type).toBe('object')
      expect(firstUserMeta.childCount).toBe(2)

      // Check name
      const name = adapter.getChild(firstUser!, 'name')
      const nameMeta = adapter.getMetadata(name!)
      expect(nameMeta.type).toBe('string')
      expect(nameMeta.displayValue).toBe('Alice')
    })

    test('handles array of primitives', () => {
      const data: JsonValue = ['a', 'b', 'c']
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('array')
      expect(meta.childCount).toBe(3)

      const children = Array.from(adapter.getChildren(data))
      for (const child of children) {
        const childMeta = adapter.getMetadata(child.value)
        expect(childMeta.type).toBe('string')
        expect(childMeta.hasChildren).toBe(false)
      }
    })
  })
})

describe('JsonNodeAdapter', () => {
  const adapter = new JsonNodeAdapter()

  describe('Primitives', () => {
    test('handles string metadata', () => {
      const data: StringNode = {
        kind: 'string',
        value: 'hello',
        // raw field omitted to save memory (now optional)
        start: 0,
        end: 7,
      }
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('string')
      expect(meta.hasChildren).toBe(false)
      expect(meta.childCount).toBe(0)
      expect(meta.displayValue).toBe('hello')
      // rawText is undefined when raw field is omitted
      expect(meta.rawText).toBeUndefined()
      expect(meta.sourceRange).toEqual({ start: 0, end: 7 })
    })

    test('handles number metadata (native)', () => {
      const data: NumberNode = {
        kind: 'number',
        value: 42,
        raw: '42',
        start: 0,
        end: 2,
      }
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('number')
      expect(meta.hasChildren).toBe(false)
      expect(meta.childCount).toBe(0)
      expect(meta.displayValue).toBe('42')
      expect(meta.rawText).toBe('42')
    })

    test('handles number metadata (bigint)', () => {
      const data: NumberNode = {
        kind: 'number',
        bigInt: 9007199254740993n,
        raw: '9007199254740993',
        start: 0,
        end: 16,
      }
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('number')
      expect(meta.displayValue).toBe('9007199254740993')
      expect(meta.rawText).toBe('9007199254740993')
    })

    test('handles number metadata (decimal)', () => {
      const data: NumberNode = {
        kind: 'number',
        decimal: '123.456789012345678901234567890',
        raw: '123.456789012345678901234567890',
        start: 0,
        end: 31,
      }
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('number')
      expect(meta.displayValue).toBe('123.456789012345678901234567890')
      expect(meta.rawText).toBe('123.456789012345678901234567890')
    })

    test('handles boolean metadata (true)', () => {
      const data: BooleanNode = {
        kind: 'boolean',
        value: true,
        start: 0,
        end: 4,
      }
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('boolean')
      expect(meta.hasChildren).toBe(false)
      expect(meta.displayValue).toBe('true')
    })

    test('handles boolean metadata (false)', () => {
      const data: BooleanNode = {
        kind: 'boolean',
        value: false,
        start: 0,
        end: 5,
      }
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('boolean')
      expect(meta.displayValue).toBe('false')
    })

    test('handles null metadata', () => {
      const data: NullNode = {
        kind: 'null',
        start: 0,
        end: 4,
      }
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('null')
      expect(meta.hasChildren).toBe(false)
      expect(meta.displayValue).toBe('null')
    })

    test('primitives have no children', () => {
      const primitives: JsonNode[] = [
        { kind: 'string', value: 'hello', raw: '"hello"', start: 0, end: 7 },
        { kind: 'number', value: 42, raw: '42', start: 0, end: 2 },
        { kind: 'boolean', value: true, start: 0, end: 4 },
        { kind: 'boolean', value: false, start: 0, end: 5 },
        { kind: 'null', start: 0, end: 4 },
      ]

      for (const primitive of primitives) {
        const children = Array.from(adapter.getChildren(primitive))
        expect(children).toHaveLength(0)
      }
    })

    test('getChild returns undefined for primitives', () => {
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
      const boolNode: BooleanNode = {
        kind: 'boolean',
        value: true,
        start: 0,
        end: 4,
      }

      expect(adapter.getChild(stringNode, 0)).toBeUndefined()
      expect(adapter.getChild(numberNode, 'key')).toBeUndefined()
      expect(adapter.getChild(boolNode, 0)).toBeUndefined()
    })
  })

  describe('Objects', () => {
    test('handles object metadata', () => {
      const data: ObjectNode = {
        kind: 'object',
        entries: [
          {
            key: { kind: 'string', value: 'a', raw: '"a"', start: 1, end: 4 },
            value: { kind: 'number', value: 1, raw: '1', start: 5, end: 6 },
          },
          {
            key: { kind: 'string', value: 'b', raw: '"b"', start: 7, end: 10 },
            value: { kind: 'number', value: 2, raw: '2', start: 11, end: 12 },
          },
          {
            key: { kind: 'string', value: 'c', raw: '"c"', start: 13, end: 16 },
            value: { kind: 'number', value: 3, raw: '3', start: 17, end: 18 },
          },
        ],
        start: 0,
        end: 19,
      }
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('object')
      expect(meta.hasChildren).toBe(true)
      expect(meta.childCount).toBe(3)
      expect(meta.displayValue).toBeNull()
      expect(meta.sourceRange).toEqual({ start: 0, end: 19 })
    })

    test('handles empty object', () => {
      const data: ObjectNode = {
        kind: 'object',
        entries: [],
        start: 0,
        end: 2,
      }
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('object')
      expect(meta.hasChildren).toBe(true)
      expect(meta.childCount).toBe(0)
    })

    test('iterates object children in source order', () => {
      const data: ObjectNode = {
        kind: 'object',
        entries: [
          {
            key: { kind: 'string', value: 'a', raw: '"a"', start: 1, end: 4 },
            value: { kind: 'number', value: 1, raw: '1', start: 5, end: 6 },
          },
          {
            key: { kind: 'string', value: 'b', raw: '"b"', start: 7, end: 10 },
            value: { kind: 'number', value: 2, raw: '2', start: 11, end: 12 },
          },
          {
            key: { kind: 'string', value: 'c', raw: '"c"', start: 13, end: 16 },
            value: { kind: 'number', value: 3, raw: '3', start: 17, end: 18 },
          },
        ],
        start: 0,
        end: 19,
      }
      const children = Array.from(adapter.getChildren(data))

      expect(children).toHaveLength(3)

      expect(children[0].key).toBe('a')
      expect((children[0].value as NumberNode).value).toBe(1)
      expect(children[0].index).toBe(0)

      expect(children[1].key).toBe('b')
      expect((children[1].value as NumberNode).value).toBe(2)
      expect(children[1].index).toBe(1)

      expect(children[2].key).toBe('c')
      expect((children[2].value as NumberNode).value).toBe(3)
      expect(children[2].index).toBe(2)
    })

    test('preserves numeric key ordering', () => {
      // Unlike JSON.parse(), JsonNode preserves exact source order
      const data: ObjectNode = {
        kind: 'object',
        entries: [
          {
            key: { kind: 'string', value: 'z', raw: '"z"', start: 1, end: 4 },
            value: { kind: 'number', value: 1, raw: '1', start: 5, end: 6 },
          },
          {
            key: { kind: 'string', value: '0', raw: '"0"', start: 7, end: 10 },
            value: { kind: 'number', value: 2, raw: '2', start: 11, end: 12 },
          },
          {
            key: { kind: 'string', value: 'a', raw: '"a"', start: 13, end: 16 },
            value: { kind: 'number', value: 3, raw: '3', start: 17, end: 18 },
          },
        ],
        start: 0,
        end: 19,
      }
      const children = Array.from(adapter.getChildren(data))

      // Keys should be in source order: z, 0, a
      expect(children[0].key).toBe('z')
      expect(children[1].key).toBe('0')
      expect(children[2].key).toBe('a')
    })

    test('getChild retrieves by key', () => {
      const data: ObjectNode = {
        kind: 'object',
        entries: [
          {
            key: { kind: 'string', value: 'name', raw: '"name"', start: 1, end: 7 },
            value: {
              kind: 'string',
              value: 'Alice',
              raw: '"Alice"',
              start: 8,
              end: 15,
            },
          },
          {
            key: { kind: 'string', value: 'age', raw: '"age"', start: 16, end: 21 },
            value: { kind: 'number', value: 30, raw: '30', start: 22, end: 24 },
          },
          {
            key: {
              kind: 'string',
              value: 'active',
              raw: '"active"',
              start: 25,
              end: 33,
            },
            value: { kind: 'boolean', value: true, start: 34, end: 38 },
          },
        ],
        start: 0,
        end: 39,
      }

      const name = adapter.getChild(data, 'name') as StringNode
      expect(name.value).toBe('Alice')

      const age = adapter.getChild(data, 'age') as NumberNode
      expect(age.value).toBe(30)

      const active = adapter.getChild(data, 'active') as BooleanNode
      expect(active.value).toBe(true)
    })

    test('getChild returns undefined for missing key', () => {
      const data: ObjectNode = {
        kind: 'object',
        entries: [
          {
            key: { kind: 'string', value: 'a', raw: '"a"', start: 1, end: 4 },
            value: { kind: 'number', value: 1, raw: '1', start: 5, end: 6 },
          },
        ],
        start: 0,
        end: 7,
      }
      expect(adapter.getChild(data, 'missing')).toBeUndefined()
    })

    test('getChild returns undefined for numeric index on object', () => {
      const data: ObjectNode = {
        kind: 'object',
        entries: [
          {
            key: { kind: 'string', value: 'a', raw: '"a"', start: 1, end: 4 },
            value: { kind: 'number', value: 1, raw: '1', start: 5, end: 6 },
          },
        ],
        start: 0,
        end: 7,
      }
      expect(adapter.getChild(data, 0)).toBeUndefined()
    })
  })

  describe('Arrays', () => {
    test('handles array metadata', () => {
      const data: ArrayNode = {
        kind: 'array',
        items: [
          { kind: 'number', value: 10, raw: '10', start: 1, end: 3 },
          { kind: 'number', value: 20, raw: '20', start: 4, end: 6 },
          { kind: 'number', value: 30, raw: '30', start: 7, end: 9 },
        ],
        start: 0,
        end: 10,
      }
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('array')
      expect(meta.hasChildren).toBe(true)
      expect(meta.childCount).toBe(3)
      expect(meta.displayValue).toBeNull()
    })

    test('handles empty array', () => {
      const data: ArrayNode = {
        kind: 'array',
        items: [],
        start: 0,
        end: 2,
      }
      const meta = adapter.getMetadata(data)

      expect(meta.type).toBe('array')
      expect(meta.hasChildren).toBe(true)
      expect(meta.childCount).toBe(0)
    })

    test('iterates array children', () => {
      const data: ArrayNode = {
        kind: 'array',
        items: [
          { kind: 'number', value: 10, raw: '10', start: 1, end: 3 },
          { kind: 'number', value: 20, raw: '20', start: 4, end: 6 },
          { kind: 'number', value: 30, raw: '30', start: 7, end: 9 },
        ],
        start: 0,
        end: 10,
      }
      const children = Array.from(adapter.getChildren(data))

      expect(children).toHaveLength(3)

      expect(children[0].key).toBeNull()
      expect((children[0].value as NumberNode).value).toBe(10)
      expect(children[0].index).toBe(0)

      expect(children[1].key).toBeNull()
      expect((children[1].value as NumberNode).value).toBe(20)
      expect(children[1].index).toBe(1)

      expect(children[2].key).toBeNull()
      expect((children[2].value as NumberNode).value).toBe(30)
      expect(children[2].index).toBe(2)
    })

    test('getChild retrieves by index', () => {
      const data: ArrayNode = {
        kind: 'array',
        items: [
          { kind: 'string', value: 'a', raw: '"a"', start: 1, end: 4 },
          { kind: 'string', value: 'b', raw: '"b"', start: 5, end: 8 },
          { kind: 'string', value: 'c', raw: '"c"', start: 9, end: 12 },
        ],
        start: 0,
        end: 13,
      }

      const item0 = adapter.getChild(data, 0) as StringNode
      expect(item0.value).toBe('a')

      const item1 = adapter.getChild(data, 1) as StringNode
      expect(item1.value).toBe('b')

      const item2 = adapter.getChild(data, 2) as StringNode
      expect(item2.value).toBe('c')
    })

    test('getChild returns undefined for out-of-bounds index', () => {
      const data: ArrayNode = {
        kind: 'array',
        items: [
          { kind: 'number', value: 1, raw: '1', start: 1, end: 2 },
          { kind: 'number', value: 2, raw: '2', start: 3, end: 4 },
          { kind: 'number', value: 3, raw: '3', start: 5, end: 6 },
        ],
        start: 0,
        end: 7,
      }

      expect(adapter.getChild(data, -1)).toBeUndefined()
      expect(adapter.getChild(data, 10)).toBeUndefined()
    })

    test('getChild returns undefined for string key on array', () => {
      const data: ArrayNode = {
        kind: 'array',
        items: [
          { kind: 'number', value: 1, raw: '1', start: 1, end: 2 },
          { kind: 'number', value: 2, raw: '2', start: 3, end: 4 },
          { kind: 'number', value: 3, raw: '3', start: 5, end: 6 },
        ],
        start: 0,
        end: 7,
      }
      expect(adapter.getChild(data, 'key')).toBeUndefined()
    })
  })

  describe('Complex structures', () => {
    test('handles mixed nested structure', () => {
      const data: ObjectNode = {
        kind: 'object',
        entries: [
          {
            key: {
              kind: 'string',
              value: 'users',
              raw: '"users"',
              start: 1,
              end: 8,
            },
            value: {
              kind: 'array',
              items: [
                {
                  kind: 'object',
                  entries: [
                    {
                      key: {
                        kind: 'string',
                        value: 'name',
                        raw: '"name"',
                        start: 10,
                        end: 16,
                      },
                      value: {
                        kind: 'string',
                        value: 'Alice',
                        raw: '"Alice"',
                        start: 17,
                        end: 24,
                      },
                    },
                  ],
                  start: 9,
                  end: 25,
                },
              ],
              start: 8,
              end: 26,
            },
          },
        ],
        start: 0,
        end: 27,
      }

      const meta = adapter.getMetadata(data)
      expect(meta.type).toBe('object')
      expect(meta.childCount).toBe(1)

      // Check users array
      const users = adapter.getChild(data, 'users') as ArrayNode
      const usersMeta = adapter.getMetadata(users)
      expect(usersMeta.type).toBe('array')
      expect(usersMeta.childCount).toBe(1)

      // Check first user
      const firstUser = adapter.getChild(users, 0) as ObjectNode
      const firstUserMeta = adapter.getMetadata(firstUser)
      expect(firstUserMeta.type).toBe('object')
      expect(firstUserMeta.childCount).toBe(1)

      // Check name
      const name = adapter.getChild(firstUser, 'name') as StringNode
      const nameMeta = adapter.getMetadata(name)
      expect(nameMeta.type).toBe('string')
      expect(nameMeta.displayValue).toBe('Alice')
    })
  })

  describe('Error handling', () => {
    test('throws error when given JsonValue instead of JsonNode', () => {
      const jsonValue = { a: 1 }

      expect(() => adapter.getMetadata(jsonValue as any)).toThrow(
        'JsonNodeAdapter expects JsonNode'
      )
    })
  })
})
