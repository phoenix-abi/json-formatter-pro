// @vitest-environment jsdom

import { h } from 'preact'
import { render, fireEvent, waitFor } from '@testing-library/preact'
import { expect, describe, test } from 'vitest'
import { JsonTreeView } from '../../../src/components/JsonTreeView'
import type { JsonValue } from '../../../src/lib/integration/types'

describe('JsonTreeView', () => {
  test('renders small JSON tree without virtualization', () => {
    const data: JsonValue = { a: 1, b: 2, c: 3 }
    const { container } = render(
      <JsonTreeView data={data} initialExpandDepth={1} />
    )

    expect(container.textContent).toContain('{')
    expect(container.textContent).toContain('a')
    expect(container.textContent).toContain('b')
    expect(container.textContent).toContain('c')
  })

  test('renders array elements', () => {
    const data: JsonValue = [1, 2, 3]
    const { container } = render(
      <JsonTreeView data={data} initialExpandDepth={1} />
    )

    expect(container.textContent).toContain('[')
    expect(container.textContent).toContain('1')
    expect(container.textContent).toContain('2')
    expect(container.textContent).toContain('3')
  })

  test('renders nested object', () => {
    const data: JsonValue = { user: { name: 'Alice', age: 30 } }
    const { container } = render(
      <JsonTreeView data={data} initialExpandDepth={2} />
    )

    expect(container.textContent).toContain('user')
    expect(container.textContent).toContain('name')
    expect(container.textContent).toContain('Alice')
    expect(container.textContent).toContain('age')
    expect(container.textContent).toContain('30')
  })

  test('renders large tree with virtualization', () => {
    const largeArray: JsonValue = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
    }))
    const { container } = render(
      <JsonTreeView data={largeArray} initialExpandDepth={0} />
    )

    // react-window should be used
    const entries = container.querySelectorAll('.entry')
    expect(entries.length).toBeLessThan(100) // Only visible + overscan
  })

  test('handles expand/collapse', async () => {
    const data: JsonValue = { users: [{ name: 'Alice' }] }
    const { container } = render(
      <JsonTreeView data={data} initialExpandDepth={0} />
    )

    // Initially collapsed (depth 0)
    expect(container.textContent).not.toContain('users')

    // Expand root
    const rootExpander = container.querySelector('.e') as HTMLElement
    expect(rootExpander).toBeTruthy()
    fireEvent.click(rootExpander)

    // Should now see "users"
    await waitFor(() => {
      expect(container.textContent).toContain('users')
    })
  })

  test('collapses expanded node', async () => {
    const data: JsonValue = { user: { name: 'Bob' } }
    const { container } = render(
      <JsonTreeView data={data} initialExpandDepth={2} />
    )

    // Initially expanded - should see nested content
    expect(container.textContent).toContain('user')
    expect(container.textContent).toContain('name')
    expect(container.textContent).toContain('Bob')

    // Click to collapse the user object
    const expanders = container.querySelectorAll('.e')
    const userExpander = expanders[1] as HTMLElement // Second expander is for 'user' key
    expect(userExpander).toBeTruthy()
    fireEvent.click(userExpander)

    // Should still see 'user' key but not nested content
    await waitFor(() => {
      expect(container.textContent).toContain('user')
      expect(container.textContent).not.toContain('name')
    })
  })

  test('uses custom row height', () => {
    const data: JsonValue = { a: 1, b: 2 }
    const { container } = render(
      <JsonTreeView data={data} initialExpandDepth={1} rowHeight={30} />
    )

    // Component should render successfully
    expect(container.querySelector('.json-tree-container')).toBeTruthy()
  })

  test('disables virtualization when virtual=false', () => {
    const largeArray: JsonValue = Array.from({ length: 200 }, (_, i) => i)
    const { container } = render(
      <JsonTreeView
        data={largeArray}
        initialExpandDepth={1}
        virtual={false}
      />
    )

    // Should render all entries directly (no virtualization)
    const entries = container.querySelectorAll('.entry')
    expect(entries.length).toBeGreaterThan(100)
  })

  test('handles primitives', () => {
    const data: JsonValue = 42
    const { container } = render(<JsonTreeView data={data} />)

    expect(container.textContent).toContain('42')
  })

  test('handles null value', () => {
    const data: JsonValue = null
    const { container } = render(<JsonTreeView data={data} />)

    expect(container.textContent).toContain('null')
  })

  test('handles boolean values', () => {
    const data: JsonValue = { flag: true, disabled: false }
    const { container } = render(
      <JsonTreeView data={data} initialExpandDepth={1} />
    )

    expect(container.textContent).toContain('flag')
    expect(container.textContent).toContain('true')
    expect(container.textContent).toContain('disabled')
    expect(container.textContent).toContain('false')
  })

  test('handles empty object', () => {
    const data: JsonValue = {}
    const { container } = render(<JsonTreeView data={data} />)

    expect(container.querySelector('.oBrace')).toBeTruthy()
    expect(container.querySelector('.cBrace')).toBeTruthy()
  })

  test('handles empty array', () => {
    const data: JsonValue = []
    const { container } = render(<JsonTreeView data={data} />)

    expect(container.querySelector('.oBracket')).toBeTruthy()
    expect(container.querySelector('.cBracket')).toBeTruthy()
  })

  test('renders with ARIA tree role', () => {
    const data: JsonValue = { a: 1 }
    const { container } = render(<JsonTreeView data={data} />)

    const treeContainer = container.querySelector('.json-tree-container')
    expect(treeContainer?.getAttribute('role')).toBe('tree')
  })

  test('handles deep nesting', () => {
    const data: JsonValue = {
      level1: {
        level2: {
          level3: {
            level4: {
              value: 'deep',
            },
          },
        },
      },
    }
    const { container } = render(
      <JsonTreeView data={data} initialExpandDepth={5} />
    )

    expect(container.textContent).toContain('level1')
    expect(container.textContent).toContain('level2')
    expect(container.textContent).toContain('level3')
    expect(container.textContent).toContain('level4')
    expect(container.textContent).toContain('deep')
  })
})
