/**
 * Contract Compliance Test Suite
 *
 * These tests define the behavioral contract that ALL adapters must satisfy.
 * When Phase II adds JsonNodeAdapter, it must pass these same tests.
 *
 * This ensures both adapters produce equivalent behavior despite different
 * underlying data models.
 */

import { describe, test, expect, beforeEach } from 'vitest'
import type {
  DataAdapter,
  ValueMetadata,
} from '../../src/lib/integration/types'
import {
  JsonValueAdapter,
  JsonNodeAdapter,
  createAdapter,
} from '../../src/lib/integration/adapters'
import { parse } from '../../src/lib/parser/parse'

/**
 * Generic test suite that any adapter implementation must pass
 *
 * @param adapterName - Name for test grouping
 * @param createAdapterInstance - Factory to create the adapter
 * @param createTestData - Factory to create test data in the adapter's format
 */
export function testAdapterCompliance(
  adapterName: string,
  createAdapterInstance: () => DataAdapter,
  createTestData: () => {
    primitiveString: any
    primitiveNumber: any
    primitiveBoolean: any
    primitiveNull: any
    simpleObject: any
    simpleArray: any
    nestedStructure: any
  }
) {
  describe(`${adapterName} Contract Compliance`, () => {
    let adapter: DataAdapter
    let testData: ReturnType<typeof createTestData>

    beforeEach(() => {
      adapter = createAdapterInstance()
      testData = createTestData()
    })

    describe('Primitives - Metadata', () => {
      test('string metadata is correct', () => {
        const meta = adapter.getMetadata(testData.primitiveString)
        expect(meta.type).toBe('string')
        expect(meta.hasChildren).toBe(false)
        expect(meta.childCount).toBe(0)
        expect(meta.displayValue).toBeTruthy()
      })

      test('number metadata is correct', () => {
        const meta = adapter.getMetadata(testData.primitiveNumber)
        expect(meta.type).toBe('number')
        expect(meta.hasChildren).toBe(false)
        expect(meta.childCount).toBe(0)
        expect(meta.displayValue).toBeTruthy()
      })

      test('boolean metadata is correct', () => {
        const meta = adapter.getMetadata(testData.primitiveBoolean)
        expect(meta.type).toBe('boolean')
        expect(meta.hasChildren).toBe(false)
        expect(meta.childCount).toBe(0)
        expect(meta.displayValue).toBeTruthy()
      })

      test('null metadata is correct', () => {
        const meta = adapter.getMetadata(testData.primitiveNull)
        expect(meta.type).toBe('null')
        expect(meta.hasChildren).toBe(false)
        expect(meta.childCount).toBe(0)
        expect(meta.displayValue).toBe('null')
      })
    })

    describe('Primitives - Children', () => {
      test('primitives have no children', () => {
        const primitives = [
          testData.primitiveString,
          testData.primitiveNumber,
          testData.primitiveBoolean,
          testData.primitiveNull,
        ]

        for (const primitive of primitives) {
          const children = Array.from(adapter.getChildren(primitive))
          expect(children).toHaveLength(0)
        }
      })

      test('getChild returns undefined for primitives', () => {
        const primitives = [
          testData.primitiveString,
          testData.primitiveNumber,
          testData.primitiveBoolean,
          testData.primitiveNull,
        ]

        for (const primitive of primitives) {
          expect(adapter.getChild(primitive, 0)).toBeUndefined()
          expect(adapter.getChild(primitive, 'key')).toBeUndefined()
        }
      })
    })

    describe('Objects - Metadata', () => {
      test('object metadata is correct', () => {
        const meta = adapter.getMetadata(testData.simpleObject)
        expect(meta.type).toBe('object')
        expect(meta.hasChildren).toBe(true)
        expect(meta.childCount).toBeGreaterThan(0)
        expect(meta.displayValue).toBeNull()
      })
    })

    describe('Objects - Children', () => {
      test('object children iteration works', () => {
        const children = Array.from(adapter.getChildren(testData.simpleObject))

        const meta = adapter.getMetadata(testData.simpleObject)
        expect(children.length).toBe(meta.childCount)

        for (const child of children) {
          expect(child.key).toBeTruthy() // Objects have string keys
          expect(typeof child.key).toBe('string')
          expect(child.value).toBeDefined()
          expect(child.index).toBeGreaterThanOrEqual(0)
        }
      })

      test('getChild by key works', () => {
        const children = Array.from(adapter.getChildren(testData.simpleObject))
        const firstChild = children[0]

        const retrieved = adapter.getChild(testData.simpleObject, firstChild.key!)
        expect(retrieved).toBe(firstChild.value)
      })

      test('getChild returns undefined for missing key', () => {
        const result = adapter.getChild(
          testData.simpleObject,
          '__nonexistent_key__'
        )
        expect(result).toBeUndefined()
      })

      test('getChild returns undefined for numeric index on object', () => {
        const result = adapter.getChild(testData.simpleObject, 0)
        expect(result).toBeUndefined()
      })
    })

    describe('Arrays - Metadata', () => {
      test('array metadata is correct', () => {
        const meta = adapter.getMetadata(testData.simpleArray)
        expect(meta.type).toBe('array')
        expect(meta.hasChildren).toBe(true)
        expect(meta.childCount).toBeGreaterThan(0)
        expect(meta.displayValue).toBeNull()
      })
    })

    describe('Arrays - Children', () => {
      test('array children iteration works', () => {
        const children = Array.from(adapter.getChildren(testData.simpleArray))

        const meta = adapter.getMetadata(testData.simpleArray)
        expect(children.length).toBe(meta.childCount)

        for (let i = 0; i < children.length; i++) {
          const child = children[i]
          expect(child.key).toBeNull() // Arrays have null keys
          expect(child.index).toBe(i)
          expect(child.value).toBeDefined()
        }
      })

      test('getChild by index works', () => {
        const children = Array.from(adapter.getChildren(testData.simpleArray))

        for (let i = 0; i < children.length; i++) {
          const retrieved = adapter.getChild(testData.simpleArray, i)
          expect(retrieved).toBe(children[i].value)
        }
      })

      test('getChild returns undefined for out-of-bounds index', () => {
        const meta = adapter.getMetadata(testData.simpleArray)

        expect(adapter.getChild(testData.simpleArray, -1)).toBeUndefined()
        expect(
          adapter.getChild(testData.simpleArray, meta.childCount + 10)
        ).toBeUndefined()
      })

      test('getChild returns undefined for string key on array', () => {
        const result = adapter.getChild(testData.simpleArray, 'key')
        expect(result).toBeUndefined()
      })
    })

    describe('Nested Structures', () => {
      test('nested traversal works', () => {
        const meta = adapter.getMetadata(testData.nestedStructure)
        expect(meta.hasChildren).toBe(true)

        const children = Array.from(adapter.getChildren(testData.nestedStructure))
        expect(children.length).toBeGreaterThan(0)

        // Traverse one level deeper
        const firstChild = children[0]
        const firstChildMeta = adapter.getMetadata(firstChild.value)

        if (firstChildMeta.hasChildren) {
          const grandchildren = Array.from(adapter.getChildren(firstChild.value))
          expect(grandchildren).toBeDefined()
          expect(Array.isArray(grandchildren)).toBe(true)
        }
      })

      test('deep nested access works', () => {
        // Access nested structure via multiple getChild calls
        const children = Array.from(adapter.getChildren(testData.nestedStructure))

        for (const child of children) {
          const childMeta = adapter.getMetadata(child.value)

          if (childMeta.hasChildren) {
            // Try to access one of its children
            if (childMeta.type === 'object') {
              const grandchildren = Array.from(adapter.getChildren(child.value))
              if (grandchildren.length > 0) {
                const grandchild = adapter.getChild(
                  child.value,
                  grandchildren[0].key!
                )
                expect(grandchild).toBeDefined()
                expect(grandchild).toBe(grandchildren[0].value)
              }
            } else if (childMeta.type === 'array') {
              const grandchildren = Array.from(adapter.getChildren(child.value))
              if (grandchildren.length > 0) {
                const grandchild = adapter.getChild(child.value, 0)
                expect(grandchild).toBeDefined()
                expect(grandchild).toBe(grandchildren[0].value)
              }
            }
          }
        }
      })
    })

    describe('Contract Guarantees', () => {
      test('childCount matches children iterator length', () => {
        const testValues = [
          testData.simpleObject,
          testData.simpleArray,
          testData.nestedStructure,
        ]

        for (const value of testValues) {
          const meta = adapter.getMetadata(value)
          const children = Array.from(adapter.getChildren(value))

          if (meta.hasChildren) {
            expect(children.length).toBe(meta.childCount)
          } else {
            expect(children.length).toBe(0)
          }
        }
      })

      test('getChild and getChildren are consistent', () => {
        const testValues = [testData.simpleObject, testData.simpleArray]

        for (const value of testValues) {
          const children = Array.from(adapter.getChildren(value))
          const meta = adapter.getMetadata(value)

          for (const child of children) {
            const keyOrIndex = meta.type === 'object' ? child.key! : child.index
            const retrieved = adapter.getChild(value, keyOrIndex)
            expect(retrieved).toBe(child.value)
          }
        }
      })
    })
  })
}

// ============================================================================
// Phase I: Test JsonValueAdapter
// ============================================================================

testAdapterCompliance(
  'JsonValueAdapter',
  () => new JsonValueAdapter(),
  () => ({
    primitiveString: 'hello',
    primitiveNumber: 42,
    primitiveBoolean: true,
    primitiveNull: null,
    simpleObject: { a: 1, b: 2, c: 3 },
    simpleArray: [10, 20, 30],
    nestedStructure: {
      user: { name: 'Alice', age: 30 },
      items: [1, 2, 3],
      active: true,
    },
  })
)

// ============================================================================
// Factory Tests
// ============================================================================

describe('createAdapter factory', () => {
  test('creates JsonValueAdapter for standard JSON values', () => {
    const testValues = [
      'string',
      42,
      true,
      null,
      { a: 1 },
      [1, 2, 3],
    ]

    for (const value of testValues) {
      const adapter = createAdapter(value)
      expect(adapter).toBeInstanceOf(JsonValueAdapter)
    }
  })

  test('adapter works correctly via factory for JsonValue', () => {
    const data = { name: 'Alice', age: 30 }
    const adapter = createAdapter(data)

    const meta = adapter.getMetadata(data)
    expect(meta.type).toBe('object')
    expect(meta.childCount).toBe(2)

    const name = adapter.getChild(data, 'name')
    expect(name).toBe('Alice')
  })

  test('creates JsonNodeAdapter for JsonNode values', () => {
    const testValues = [
      parse('"string"').ast,
      parse('42').ast,
      parse('true').ast,
      parse('null').ast,
      parse('{"a": 1}').ast,
      parse('[1, 2, 3]').ast,
    ]

    for (const value of testValues) {
      const adapter = createAdapter(value)
      expect(adapter).toBeInstanceOf(JsonNodeAdapter)
    }
  })

  test('adapter works correctly via factory for JsonNode', () => {
    const data = parse('{"name": "Alice", "age": 30}').ast
    const adapter = createAdapter(data)

    const meta = adapter.getMetadata(data)
    expect(meta.type).toBe('object')
    expect(meta.childCount).toBe(2)

    const name = adapter.getChild(data, 'name')
    expect(name).toBeDefined()

    const nameMeta = adapter.getMetadata(name!)
    expect(nameMeta.type).toBe('string')
    expect(nameMeta.displayValue).toBe('Alice')
  })
})

// ============================================================================
// Phase II: Test JsonNodeAdapter
// ============================================================================

testAdapterCompliance(
  'JsonNodeAdapter',
  () => new JsonNodeAdapter(),
  () => ({
    primitiveString: parse('"hello"').ast,
    primitiveNumber: parse('42').ast,
    primitiveBoolean: parse('true').ast,
    primitiveNull: parse('null').ast,
    simpleObject: parse('{"a": 1, "b": 2, "c": 3}').ast,
    simpleArray: parse('[10, 20, 30]').ast,
    nestedStructure: parse(
      '{"user": {"name": "Alice", "age": 30}, "items": [1, 2, 3], "active": true}'
    ).ast,
  })
)
