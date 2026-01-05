import { describe, test, expect } from 'vitest'
import { flattenTree } from '../../../src/lib/tree/flatten'
import { expandToDepth } from '../../../src/lib/tree/expand'
import type { TreeState } from '../../../src/lib/tree/types'
import type { JsonValue } from '../../../src/lib/integration/types'

describe('flattenTree', () => {
  describe('Collapsed root', () => {
    test('flattens simple object with root collapsed', () => {
      const data: JsonValue = { a: 1, b: 2 }
      const state: TreeState = { expandedPaths: new Set<string>() }
      const flat = flattenTree(data, state)

      expect(flat).toHaveLength(1)
      expect(flat[0].path).toBe('$')
      expect(flat[0].hasChildren).toBe(true)
      expect(flat[0].childCount).toBe(2)
      expect(flat[0].isExpanded).toBe(false)
    })

    test('flattens simple array with root collapsed', () => {
      const data: JsonValue = [1, 2, 3]
      const state: TreeState = { expandedPaths: new Set<string>() }
      const flat = flattenTree(data, state)

      expect(flat).toHaveLength(1)
      expect(flat[0].path).toBe('$')
      expect(flat[0].type).toBe('array')
      expect(flat[0].childCount).toBe(3)
      expect(flat[0].isExpanded).toBe(false)
    })

    test('collapsed node has correct metadata', () => {
      const data: JsonValue = { x: { nested: 'value' } }
      const state: TreeState = { expandedPaths: new Set<string>() }
      const flat = flattenTree(data, state)

      expect(flat[0].hasChildren).toBe(true)
      expect(flat[0].isExpanded).toBe(false)
      expect(flat[0].displayValue).toBeNull() // Objects don't have display values
    })
  })

  describe('Expanded root', () => {
    test('flattens object with root expanded', () => {
      const data: JsonValue = { a: 1, b: 2 }
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(data, state)

      // Root + 2 children + closing brace
      expect(flat).toHaveLength(4)

      expect(flat[0].path).toBe('$')
      expect(flat[0].isExpanded).toBe(true)

      expect(flat[1].path).toBe('$.a')
      expect(flat[1].key).toBe('a')
      expect(flat[1].value).toBe(1)
      expect(flat[1].depth).toBe(1)

      expect(flat[2].path).toBe('$.b')
      expect(flat[2].key).toBe('b')

      // Closing brace
      expect(flat[3].path).toBe('$__close')
      expect(flat[3].type).toBe('object_close')
    })

    test('includes closing bracket for expanded arrays', () => {
      const data: JsonValue = [10, 20]
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(data, state)

      // Root + 2 items + closing bracket
      expect(flat).toHaveLength(4)

      expect(flat[3].path).toBe('$__close')
      expect(flat[3].type).toBe('array_close')
    })
  })

  describe('Depth and indentation', () => {
    test('assigns correct depth to nodes', () => {
      const data: JsonValue = { a: { b: { c: 1 } } }
      const state: TreeState = {
        expandedPaths: new Set(['$', '$.a', '$.a.b']),
      }
      const flat = flattenTree(data, state)

      const depths = flat.filter((n) => !n.path.endsWith('__close')).map((n) => n.depth)
      expect(depths).toEqual([0, 1, 2, 3])
    })

    test('depth is consistent for siblings', () => {
      const data: JsonValue = { a: 1, b: 2, c: 3 }
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(data, state)

      const children = flat.filter((n) => n.depth === 1)
      expect(children).toHaveLength(3)
      children.forEach((child) => expect(child.depth).toBe(1))
    })
  })

  describe('Sibling tracking', () => {
    test('marks last sibling correctly', () => {
      const data: JsonValue = { a: 1, b: 2, c: 3 }
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(data, state)

      const children = flat.filter((n) => n.depth === 1)
      expect(children[0].isLastSibling).toBe(false) // a
      expect(children[1].isLastSibling).toBe(false) // b
      expect(children[2].isLastSibling).toBe(true)  // c
    })

    test('tracks index in parent', () => {
      const data: JsonValue = ['a', 'b', 'c']
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(data, state)

      const items = flat.filter((n) => n.depth === 1)
      expect(items[0].indexInParent).toBe(0)
      expect(items[1].indexInParent).toBe(1)
      expect(items[2].indexInParent).toBe(2)
    })
  })

  describe('Keys and paths', () => {
    test('object properties have string keys', () => {
      const data: JsonValue = { name: 'Alice', age: 30 }
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(data, state)

      const props = flat.filter((n) => n.depth === 1)
      expect(props[0].key).toBe('name')
      expect(props[1].key).toBe('age')
    })

    test('array elements have null keys', () => {
      const data: JsonValue = ['a', 'b', 'c']
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(data, state)

      const items = flat.filter((n) => n.depth === 1)
      items.forEach((item) => expect(item.key).toBeNull())
    })

    test('generates correct paths for object properties', () => {
      const data: JsonValue = { user: { name: 'Alice' } }
      const state: TreeState = { expandedPaths: new Set(['$', '$.user']) }
      const flat = flattenTree(data, state)

      const paths = flat.filter((n) => !n.path.endsWith('__close')).map((n) => n.path)
      expect(paths).toContain('$')
      expect(paths).toContain('$.user')
      expect(paths).toContain('$.user.name')
    })

    test('generates correct paths for array elements', () => {
      const data: JsonValue = { items: [1, 2] }
      const state: TreeState = { expandedPaths: new Set(['$', '$.items']) }
      const flat = flattenTree(data, state)

      const paths = flat.filter((n) => !n.path.endsWith('__close')).map((n) => n.path)
      expect(paths).toContain('$.items[0]')
      expect(paths).toContain('$.items[1]')
    })
  })

  describe('Nested structures', () => {
    test('handles deeply nested expansion', () => {
      const data: JsonValue = { users: [{ name: 'Alice', age: 30 }] }
      const state: TreeState = {
        expandedPaths: new Set(['$', '$.users', '$.users[0]']),
      }
      const flat = flattenTree(data, state)

      const paths = flat.filter((n) => !n.path.endsWith('__close')).map((n) => n.path)
      expect(paths).toContain('$')
      expect(paths).toContain('$.users')
      expect(paths).toContain('$.users[0]')
      expect(paths).toContain('$.users[0].name')
      expect(paths).toContain('$.users[0].age')
    })

    test('only includes expanded paths', () => {
      const data: JsonValue = {
        a: { b: 1 },
        c: { d: 2 },
      }
      const state: TreeState = { expandedPaths: new Set(['$', '$.a']) }
      const flat = flattenTree(data, state)

      const paths = flat.map((n) => n.path)
      expect(paths).toContain('$.a')
      expect(paths).toContain('$.a.b')
      expect(paths).toContain('$.c')
      expect(paths).not.toContain('$.c.d') // Not expanded
    })
  })

  describe('Empty containers', () => {
    test('handles empty objects', () => {
      const data: JsonValue = { empty: {} }
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(data, state)

      const emptyObj = flat.find((n) => n.path === '$.empty')
      expect(emptyObj?.childCount).toBe(0)
      expect(emptyObj?.hasChildren).toBe(true)
    })

    test('handles empty arrays', () => {
      const data: JsonValue = { empty: [] }
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(data, state)

      const emptyArr = flat.find((n) => n.path === '$.empty')
      expect(emptyArr?.childCount).toBe(0)
      expect(emptyArr?.hasChildren).toBe(true)
    })

    test('expanded empty object has closing brace', () => {
      const data: JsonValue = {}
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(data, state)

      expect(flat).toHaveLength(2) // Root + closing brace
      expect(flat[1].type).toBe('object_close')
    })
  })

  describe('Primitive values', () => {
    test('flattens primitive at root', () => {
      const primitives = [
        42,
        'hello',
        true,
        false,
        null,
      ]

      for (const primitive of primitives) {
        const state: TreeState = { expandedPaths: new Set() }
        const flat = flattenTree(primitive, state)

        expect(flat).toHaveLength(1)
        expect(flat[0].path).toBe('$')
        expect(flat[0].hasChildren).toBe(false)
        expect(flat[0].displayValue).not.toBeNull()
      }
    })

    test('primitives have correct display values', () => {
      const data: JsonValue = { str: 'hello', num: 42, bool: true, nil: null }
      const state: TreeState = { expandedPaths: new Set(['$']) }
      const flat = flattenTree(data, state)

      const str = flat.find((n) => n.path === '$.str')
      expect(str?.displayValue).toBe('hello')

      const num = flat.find((n) => n.path === '$.num')
      expect(num?.displayValue).toBe('42')

      const bool = flat.find((n) => n.path === '$.bool')
      expect(bool?.displayValue).toBe('true')

      const nil = flat.find((n) => n.path === '$.nil')
      expect(nil?.displayValue).toBe('null')
    })
  })

  describe('Integration with expandToDepth', () => {
    test('works with expandToDepth utility', () => {
      const data: JsonValue = { a: { b: { c: 1 } } }
      const expandedPaths = expandToDepth(data, 2)
      const state: TreeState = { expandedPaths }
      const flat = flattenTree(data, state)

      const paths = flat.filter((n) => !n.path.endsWith('__close')).map((n) => n.path)
      expect(paths).toContain('$')
      expect(paths).toContain('$.a')
      expect(paths).toContain('$.a.b')
      expect(paths).not.toContain('$.a.b.c') // Beyond depth 2
    })

    test('expands to depth 0 shows only root', () => {
      const data: JsonValue = { a: { b: 1 } }
      const expandedPaths = expandToDepth(data, 0)
      const state: TreeState = { expandedPaths }
      const flat = flattenTree(data, state)

      expect(flat).toHaveLength(1)
      expect(flat[0].path).toBe('$')
      expect(flat[0].isExpanded).toBe(false)
    })
  })
})
