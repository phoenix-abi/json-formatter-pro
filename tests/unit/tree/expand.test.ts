import { describe, test, expect } from 'vitest'
import {
  toggleNode,
  expandPath,
  expandToDepth,
  collapseAll,
  expandAllSiblings,
} from '../../../src/lib/tree/expand'
import { flattenTree } from '../../../src/lib/tree/flatten'
import type { TreeState } from '../../../src/lib/tree/types'
import type { JsonValue } from '../../../src/lib/integration/types'

describe('toggleNode', () => {
  test('expands collapsed node', () => {
    const state: TreeState = { expandedPaths: new Set<string>() }
    const newState = toggleNode(state, '$.users')

    expect(newState.expandedPaths.has('$.users')).toBe(true)
  })

  test('collapses expanded node', () => {
    const state: TreeState = { expandedPaths: new Set(['$.users']) }
    const newState = toggleNode(state, '$.users')

    expect(newState.expandedPaths.has('$.users')).toBe(false)
  })

  test('does not mutate original state', () => {
    const state: TreeState = { expandedPaths: new Set(['$']) }
    const newState = toggleNode(state, '$.a')

    expect(state.expandedPaths.has('$.a')).toBe(false)
    expect(newState.expandedPaths.has('$.a')).toBe(true)
  })

  test('multiple toggles work correctly', () => {
    let state: TreeState = { expandedPaths: new Set<string>() }

    state = toggleNode(state, '$.a')
    expect(state.expandedPaths.has('$.a')).toBe(true)

    state = toggleNode(state, '$.b')
    expect(state.expandedPaths.has('$.a')).toBe(true)
    expect(state.expandedPaths.has('$.b')).toBe(true)

    state = toggleNode(state, '$.a')
    expect(state.expandedPaths.has('$.a')).toBe(false)
    expect(state.expandedPaths.has('$.b')).toBe(true)
  })
})

describe('expandPath', () => {
  test('expands node and all ancestors', () => {
    const state: TreeState = { expandedPaths: new Set<string>() }
    const newState = expandPath(state, '$.a.b.c')

    expect(newState.expandedPaths.has('$')).toBe(true)
    expect(newState.expandedPaths.has('$.a')).toBe(true)
    expect(newState.expandedPaths.has('$.a.b')).toBe(true)
    expect(newState.expandedPaths.has('$.a.b.c')).toBe(true)
  })

  test('handles array paths', () => {
    const state: TreeState = { expandedPaths: new Set<string>() }
    const newState = expandPath(state, '$.users[0].name')

    expect(newState.expandedPaths.has('$')).toBe(true)
    expect(newState.expandedPaths.has('$.users')).toBe(true)
    expect(newState.expandedPaths.has('$.users[0]')).toBe(true)
    expect(newState.expandedPaths.has('$.users[0].name')).toBe(true)
  })

  test('expands root only for root path', () => {
    const state: TreeState = { expandedPaths: new Set<string>() }
    const newState = expandPath(state, '$')

    expect(newState.expandedPaths.has('$')).toBe(true)
    expect(newState.expandedPaths.size).toBe(1)
  })

  test('does not mutate original state', () => {
    const state: TreeState = { expandedPaths: new Set<string>() }
    const newState = expandPath(state, '$.a.b')

    expect(state.expandedPaths.size).toBe(0)
    expect(newState.expandedPaths.size).toBe(3) // $, $.a, $.a.b
  })
})

describe('expandToDepth', () => {
  test('expands to depth 0 (root only)', () => {
    const data: JsonValue = { a: { b: { c: 1 } } }
    const expanded = expandToDepth(data, 0)

    expect(expanded.size).toBe(0)
  })

  test('expands to depth 1', () => {
    const data: JsonValue = { a: { b: { c: 1 } } }
    const expanded = expandToDepth(data, 1)

    expect(expanded.has('$')).toBe(true)
    expect(expanded.has('$.a')).toBe(false)
  })

  test('expands to depth 2', () => {
    const data: JsonValue = { a: { b: { c: 1 } } }
    const expanded = expandToDepth(data, 2)

    expect(expanded.has('$')).toBe(true)
    expect(expanded.has('$.a')).toBe(true)
    expect(expanded.has('$.a.b')).toBe(false)
  })

  test('expands to depth 3', () => {
    const data: JsonValue = { a: { b: { c: 1 } } }
    const expanded = expandToDepth(data, 3)

    expect(expanded.has('$')).toBe(true)
    expect(expanded.has('$.a')).toBe(true)
    expect(expanded.has('$.a.b')).toBe(true)
    expect(expanded.has('$.a.b.c')).toBe(false) // c is a leaf
  })

  test('handles arrays', () => {
    const data: JsonValue = { items: [{ id: 1 }, { id: 2 }] }
    const expanded = expandToDepth(data, 2)

    expect(expanded.has('$')).toBe(true)
    expect(expanded.has('$.items')).toBe(true)
    expect(expanded.has('$.items[0]')).toBe(false)
    expect(expanded.has('$.items[1]')).toBe(false)
  })

  test('handles mixed nesting', () => {
    const data: JsonValue = {
      users: [{ name: 'Alice' }],
      settings: { theme: 'dark' },
    }
    const expanded = expandToDepth(data, 2)

    expect(expanded.has('$')).toBe(true)
    expect(expanded.has('$.users')).toBe(true)
    expect(expanded.has('$.settings')).toBe(true)
    expect(expanded.has('$.users[0]')).toBe(false)
    expect(expanded.has('$.settings.theme')).toBe(false)
  })

  test('large depth expands entire tree', () => {
    const data: JsonValue = { a: { b: { c: 1 } } }
    const expanded = expandToDepth(data, 100)

    expect(expanded.has('$')).toBe(true)
    expect(expanded.has('$.a')).toBe(true)
    expect(expanded.has('$.a.b')).toBe(true)
    // Leaf nodes are not expanded
    expect(expanded.has('$.a.b.c')).toBe(false)
  })

  test('handles primitives gracefully', () => {
    const data: JsonValue = 42
    const expanded = expandToDepth(data, 10)

    expect(expanded.size).toBe(0) // Primitives have no children
  })
})

describe('collapseAll', () => {
  test('returns empty expansion state', () => {
    const state = collapseAll()

    expect(state.expandedPaths.size).toBe(0)
  })

  test('creates new state object', () => {
    const state1 = collapseAll()
    const state2 = collapseAll()

    expect(state1).not.toBe(state2)
    expect(state1.expandedPaths).not.toBe(state2.expandedPaths)
  })
})

describe('expandAllSiblings', () => {
  test('expands all siblings at same depth', () => {
    const data: JsonValue = {
      a: { x: 1 },
      b: { y: 2 },
      c: { z: 3 },
    }
    const state: TreeState = { expandedPaths: new Set(['$']) }
    const flatNodes = flattenTree(data, state)

    const newState = expandAllSiblings(state, '$.a', flatNodes)

    expect(newState.expandedPaths.has('$.a')).toBe(true)
    expect(newState.expandedPaths.has('$.b')).toBe(true)
    expect(newState.expandedPaths.has('$.c')).toBe(true)
  })

  test('does not expand siblings without children', () => {
    const data: JsonValue = {
      a: { x: 1 },
      b: 'primitive',
      c: { z: 3 },
    }
    const state: TreeState = { expandedPaths: new Set(['$']) }
    const flatNodes = flattenTree(data, state)

    const newState = expandAllSiblings(state, '$.a', flatNodes)

    expect(newState.expandedPaths.has('$.a')).toBe(true)
    expect(newState.expandedPaths.has('$.b')).toBe(false) // Primitive
    expect(newState.expandedPaths.has('$.c')).toBe(true)
  })

  test('only expands siblings at same depth', () => {
    const data: JsonValue = {
      parent: {
        child1: { x: 1 },
        child2: { y: 2 },
      },
      other: { z: 3 },
    }
    const state: TreeState = { expandedPaths: new Set(['$', '$.parent']) }
    const flatNodes = flattenTree(data, state)

    const newState = expandAllSiblings(state, '$.parent.child1', flatNodes)

    expect(newState.expandedPaths.has('$.parent.child1')).toBe(true)
    expect(newState.expandedPaths.has('$.parent.child2')).toBe(true)
    expect(newState.expandedPaths.has('$.other')).toBe(false) // Different parent
  })

  test('handles array siblings', () => {
    const data: JsonValue = {
      items: [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ],
    }
    const state: TreeState = { expandedPaths: new Set(['$', '$.items']) }
    const flatNodes = flattenTree(data, state)

    const newState = expandAllSiblings(state, '$.items[0]', flatNodes)

    expect(newState.expandedPaths.has('$.items[0]')).toBe(true)
    expect(newState.expandedPaths.has('$.items[1]')).toBe(true)
    expect(newState.expandedPaths.has('$.items[2]')).toBe(true)
  })

  test('returns original state if path not found', () => {
    const data: JsonValue = { a: 1 }
    const state: TreeState = { expandedPaths: new Set(['$']) }
    const flatNodes = flattenTree(data, state)

    const newState = expandAllSiblings(state, '$.nonexistent', flatNodes)

    expect(newState).toBe(state)
  })

  test('preserves existing expanded paths', () => {
    const data: JsonValue = {
      a: { x: 1 },
      b: { y: 2 },
      c: { z: 3 },
    }
    const state: TreeState = { expandedPaths: new Set(['$', '$.other']) }
    const flatNodes = flattenTree(data, state)

    const newState = expandAllSiblings(state, '$.a', flatNodes)

    expect(newState.expandedPaths.has('$')).toBe(true)
    expect(newState.expandedPaths.has('$.other')).toBe(true)
    expect(newState.expandedPaths.has('$.a')).toBe(true)
    expect(newState.expandedPaths.has('$.b')).toBe(true)
  })
})
