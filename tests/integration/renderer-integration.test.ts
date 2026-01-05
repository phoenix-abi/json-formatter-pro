/**
 * Renderer Integration Tests
 *
 * Verifies that the custom parser (JsonNode) integrates correctly
 * with the Preact renderer via the DataAdapter pattern.
 *
 * These tests ensure end-to-end functionality from parsing to rendering.
 */

import { describe, test, expect } from 'vitest'
import { parse } from '../../src/lib/parser/parse'
import { flattenTree } from '../../src/lib/tree/flatten'
import { expandToDepth } from '../../src/lib/tree/expand'
import { createAdapter } from '../../src/lib/integration/adapters'
import type { TreeState } from '../../src/lib/tree/types'
import type { JsonNode } from '../../src/lib/integration/types'

describe('Custom Parser → Renderer Integration', () => {
  describe('Basic Rendering Pipeline', () => {
    test('custom parser output can be flattened', () => {
      const json = '{"name": "Alice", "age": 30}'
      const { ast: parsed } = parse(json)

      // Verify it's a JsonNode
      expect(parsed).toHaveProperty('kind')
      expect(parsed).toHaveProperty('start')
      expect(parsed).toHaveProperty('end')

      // Flatten with root collapsed
      const state: TreeState = { expandedPaths: new Set() }
      const flat = flattenTree(parsed, state)

      expect(flat).toHaveLength(1)
      expect(flat[0].type).toBe('object')
      expect(flat[0].hasChildren).toBe(true)
      expect(flat[0].childCount).toBe(2)
    })

    test('expanded custom parser tree shows children', () => {
      const json = '{"x": 1, "y": 2}'
      const { ast: parsed } = parse(json)
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(parsed, state)

      // Root + 2 children + closing brace
      expect(flat).toHaveLength(4)

      expect(flat[0].path).toBe('$')
      expect(flat[0].isExpanded).toBe(true)

      expect(flat[1].path).toBe('$.x')
      expect(flat[1].key).toBe('x')
      expect(flat[1].type).toBe('number')

      expect(flat[2].path).toBe('$.y')
      expect(flat[2].key).toBe('y')

      expect(flat[3].type).toBe('object_close')
    })

    test('adapter factory selects JsonNodeAdapter for custom parser', () => {
      const json = '{"test": true}'
      const { ast: parsed } = parse(json)
      const adapter = createAdapter(parsed)

      const meta = adapter.getMetadata(parsed)
      expect(meta.type).toBe('object')
      expect(meta.childCount).toBe(1)
    })
  })

  describe('Lossless Number Handling', () => {
    test('large integers preserve precision with bigint mode', () => {
      // Number larger than Number.MAX_SAFE_INTEGER
      const json = '{"bigNum": 9007199254740993}'
      const { ast: parsed, input } = parse(json, { numberMode: 'bigint' })
      const adapter = createAdapter(parsed, input)

      // Get the bigNum child
      const bigNum = adapter.getChild(parsed, 'bigNum')
      expect(bigNum).toBeDefined()

      const meta = adapter.getMetadata(bigNum!)
      expect(meta.type).toBe('number')

      // Custom parser with bigint mode preserves exact value
      expect(meta.displayValue).toBe('9007199254740993')
      expect(meta.rawText).toBe('9007199254740993')
    })

    test('native mode shows precision loss (expected behavior)', () => {
      // Demonstrates that native mode behaves like JSON.parse()
      const json = '{"bigNum": 9007199254740993}'
      const { ast: parsed, input } = parse(json) // Default: native mode
      const adapter = createAdapter(parsed, input)

      const bigNum = adapter.getChild(parsed, 'bigNum')
      const meta = adapter.getMetadata(bigNum!)

      // Native mode loses precision (just like JSON.parse)
      expect(meta.displayValue).toBe('9007199254740992')
      // But rawText still preserves the original
      expect(meta.rawText).toBe('9007199254740993')
    })

    test('decimal numbers preserve precision with decimal mode', () => {
      const json = '{"pi": 3.141592653589793238462643383279}'
      const { ast: parsed, input } = parse(json, { numberMode: 'decimal' })
      const adapter = createAdapter(parsed, input)

      const pi = adapter.getChild(parsed, 'pi')
      const meta = adapter.getMetadata(pi!)

      // Custom parser with decimal mode stores full decimal string
      expect(meta.rawText).toBe('3.141592653589793238462643383279')
      expect(meta.displayValue).toBe('3.141592653589793238462643383279')
    })

    test('flattened tree includes rawText metadata', () => {
      const json = '{"value": 123.456789}'
      const { ast: parsed, input } = parse(json)
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(parsed, state, null, 0, '$', 0, 1, input)

      // Find the number node
      const numberNode = flat.find((n) => n.key === 'value')
      expect(numberNode).toBeDefined()
      expect(numberNode!.rawText).toBe('123.456789')
    })
  })

  describe('Key Order Preservation', () => {
    test('custom parser preserves exact key order', () => {
      // Keys in specific order: z, a, m
      const json = '{"z": 1, "a": 2, "m": 3}'
      const { ast: parsed } = parse(json)
      const adapter = createAdapter(parsed)

      const children = Array.from(adapter.getChildren(parsed))
      const keys = children.map((c) => c.key)

      // Custom parser preserves exact order from source
      expect(keys).toEqual(['z', 'a', 'm'])
    })

    test('flattened tree maintains key order from parser', () => {
      const json = '{"third": 3, "first": 1, "second": 2}'
      const { ast: parsed } = parse(json)
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(parsed, state)

      // Get child nodes (skip root and closing brace)
      const children = flat.filter((n) => n.depth === 1)
      const keys = children.map((n) => n.key)

      expect(keys).toEqual(['third', 'first', 'second'])
    })
  })

  describe('Nested Structures', () => {
    test('deeply nested custom parser output flattens correctly', () => {
      const json = '{"a": {"b": {"c": {"d": 1}}}}'
      const { ast: parsed } = parse(json)
      const state: TreeState = {
        expandedPaths: new Set(['$', '$.a', '$.a.b', '$.a.b.c']),
      }
      const flat = flattenTree(parsed, state)

      // Find the deepest node
      const deepest = flat.find((n) => n.path === '$.a.b.c.d')
      expect(deepest).toBeDefined()
      expect(deepest!.depth).toBe(4)
      expect(deepest!.type).toBe('number')
    })

    test('mixed arrays and objects work correctly', () => {
      const json = '{"items": [{"id": 1}, {"id": 2}]}'
      const { ast: parsed } = parse(json)
      const state: TreeState = {
        expandedPaths: new Set(['$', '$.items', '$.items[0]', '$.items[1]']),
      }
      const flat = flattenTree(parsed, state)

      // Verify structure
      const item0id = flat.find((n) => n.path === '$.items[0].id')
      const item1id = flat.find((n) => n.path === '$.items[1].id')

      expect(item0id).toBeDefined()
      expect(item1id).toBeDefined()
      expect(item0id!.type).toBe('number')
      expect(item1id!.type).toBe('number')
    })
  })

  describe('Source Range Metadata', () => {
    test('custom parser provides source position tracking', () => {
      const json = '{"x": 123}'
      const { ast: parsed } = parse(json)
      const adapter = createAdapter(parsed)

      const meta = adapter.getMetadata(parsed)

      // Custom parser includes source range
      expect(meta.sourceRange).toBeDefined()
      expect(meta.sourceRange!.start).toBeGreaterThanOrEqual(0)
      expect(meta.sourceRange!.end).toBeGreaterThan(meta.sourceRange!.start)
    })

    test('child nodes have accurate source ranges', () => {
      const json = '{"name": "Alice", "age": 30}'
      const { ast: parsed } = parse(json)
      const adapter = createAdapter(parsed)

      const children = Array.from(adapter.getChildren(parsed))

      for (const child of children) {
        const meta = adapter.getMetadata(child.value)
        expect(meta.sourceRange).toBeDefined()
        expect(meta.sourceRange!.start).toBeGreaterThanOrEqual(0)
        expect(meta.sourceRange!.end).toBeGreaterThan(meta.sourceRange!.start)
      }
    })
  })

  describe('Expand/Collapse with Custom Parser', () => {
    test('expandToDepth works with custom parser', () => {
      const json = '{"a": {"b": {"c": 1}}}'
      const { ast: parsed } = parse(json)

      const expandedPaths = expandToDepth(parsed, 2)

      expect(expandedPaths.has('$')).toBe(true)
      expect(expandedPaths.has('$.a')).toBe(true)
      expect(expandedPaths.has('$.a.b')).toBe(false) // Depth 2 stops here
    })

    test('partial expansion creates correct flat structure', () => {
      const json = '{"x": {"y": {"z": 1}}, "a": {"b": 2}}'
      const { ast: parsed } = parse(json)

      // Expand only root and $.x
      const state: TreeState = { expandedPaths: new Set(['$', '$.x']) }
      const flat = flattenTree(parsed, state)

      // Should include: $, x, x.y (collapsed), x__close, a (collapsed), $__close
      expect(flat.length).toBeGreaterThan(4)

      const yNode = flat.find((n) => n.path === '$.x.y')
      expect(yNode).toBeDefined()
      expect(yNode!.isExpanded).toBe(false)
      expect(yNode!.hasChildren).toBe(true)

      // z should NOT be in the flat tree (y is collapsed)
      const zNode = flat.find((n) => n.path === '$.x.y.z')
      expect(zNode).toBeUndefined()
    })
  })

  describe('Equivalence: JsonValue vs JsonNode', () => {
    test('same JSON produces equivalent flat trees', () => {
      const json = '{"name": "Test", "count": 42, "active": true}'

      // Parse with custom parser
      const { ast: customParsed } = parse(json)
      // Parse with native JSON.parse()
      const nativeParsed = JSON.parse(json)

      const state: TreeState = { expandedPaths: new Set(['$']) }

      const customFlat = flattenTree(customParsed, state)
      const nativeFlat = flattenTree(nativeParsed, state)

      // Should have same structure
      expect(customFlat.length).toBe(nativeFlat.length)

      for (let i = 0; i < customFlat.length; i++) {
        expect(customFlat[i].path).toBe(nativeFlat[i].path)
        expect(customFlat[i].type).toBe(nativeFlat[i].type)
        expect(customFlat[i].depth).toBe(nativeFlat[i].depth)
        expect(customFlat[i].hasChildren).toBe(nativeFlat[i].hasChildren)

        // Display values should match (for simple values)
        if (customFlat[i].type !== 'object' && customFlat[i].type !== 'array') {
          expect(customFlat[i].displayValue).toBe(nativeFlat[i].displayValue)
        }
      }
    })
  })

  describe('Edge Cases', () => {
    test('empty object renders correctly', () => {
      const json = '{}'
      const { ast: parsed } = parse(json)
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(parsed, state)

      // Root + closing brace (no children)
      expect(flat).toHaveLength(2)
      expect(flat[0].childCount).toBe(0)
      expect(flat[1].type).toBe('object_close')
    })

    test('empty array renders correctly', () => {
      const json = '[]'
      const { ast: parsed } = parse(json)
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(parsed, state)

      // Root + closing bracket (no items)
      expect(flat).toHaveLength(2)
      expect(flat[0].childCount).toBe(0)
      expect(flat[1].type).toBe('array_close')
    })

    test('null value renders correctly', () => {
      const json = '{"value": null}'
      const { ast: parsed } = parse(json)
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(parsed, state)

      const nullNode = flat.find((n) => n.key === 'value')
      expect(nullNode).toBeDefined()
      expect(nullNode!.type).toBe('null')
      expect(nullNode!.displayValue).toBe('null')
    })

    test('array with mixed types', () => {
      const json = '[1, "two", true, null, {"five": 5}]'
      const { ast: parsed } = parse(json)
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(parsed, state)

      const types = flat
        .filter((n) => n.depth === 1)
        .map((n) => n.type)

      expect(types).toEqual(['number', 'string', 'boolean', 'null', 'object'])
    })
  })
})
