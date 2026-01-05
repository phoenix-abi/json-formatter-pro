// @vitest-environment jsdom

import { h } from 'preact'
import { render, fireEvent } from '@testing-library/preact'
import { expect, describe, test, vi } from 'vitest'
import { JsonNode } from '../../../src/components/JsonNode'
import type { FlatNode } from '../../../src/lib/tree/types'

describe('JsonNode', () => {
  const mockToggle = vi.fn()

  describe('Primitive types', () => {
    test('renders string primitive', () => {
      const node: FlatNode = {
        id: '$.name',
        depth: 1,
        key: 'name',
        value: 'Alice',
        type: 'string',
        path: '$.name',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: false,
        displayValue: 'Alice',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.k')?.textContent).toBe('name')
      expect(container.querySelector('.s')).toBeTruthy()
      expect(container.textContent).toContain('Alice')
      expect(container.querySelector('.comma')).toBeTruthy()
    })

    test('renders number primitive', () => {
      const node: FlatNode = {
        id: '$.age',
        depth: 1,
        key: 'age',
        value: 42,
        type: 'number',
        path: '$.age',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: '42',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.n')?.textContent).toBe('42')
      expect(container.querySelector('.comma')).toBeNull() // Last sibling
    })

    test('renders boolean primitive (true)', () => {
      const node: FlatNode = {
        id: '$.active',
        depth: 1,
        key: 'active',
        value: true,
        type: 'boolean',
        path: '$.active',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: false,
        displayValue: 'true',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.bl')?.textContent).toBe('true')
    })

    test('renders boolean primitive (false)', () => {
      const node: FlatNode = {
        id: '$.active',
        depth: 1,
        key: 'active',
        value: false,
        type: 'boolean',
        path: '$.active',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: false,
        displayValue: 'false',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.bl')?.textContent).toBe('false')
    })

    test('renders null primitive', () => {
      const node: FlatNode = {
        id: '$.data',
        depth: 1,
        key: 'data',
        value: null,
        type: 'null',
        path: '$.data',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: false,
        displayValue: 'null',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.nl')?.textContent).toBe('null')
    })
  })

  describe('Object nodes', () => {
    test('renders collapsed object with size annotation', () => {
      const node: FlatNode = {
        id: '$',
        depth: 0,
        key: null,
        value: { a: 1, b: 2 },
        type: 'object',
        path: '$',
        hasChildren: true,
        isExpanded: false,
        childCount: 2,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.oBrace')).toBeTruthy()
      expect(container.querySelector('.ellipsis')).toBeTruthy()
      expect(container.querySelector('.cBrace')).toBeTruthy()
      expect(container.textContent).toContain('2 items')
    })

    test('renders expanded object without size annotation', () => {
      const node: FlatNode = {
        id: '$',
        depth: 0,
        key: null,
        value: { a: 1 },
        type: 'object',
        path: '$',
        hasChildren: true,
        isExpanded: true,
        childCount: 1,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.oBrace')).toBeTruthy()
      expect(container.querySelector('.ellipsis')).toBeNull()
      expect(container.querySelector('.cBrace')).toBeNull() // Closing brace on separate line
      expect(container.textContent).not.toContain('items')
    })

    test('renders empty object', () => {
      const node: FlatNode = {
        id: '$.empty',
        depth: 1,
        key: 'empty',
        value: {},
        type: 'object',
        path: '$.empty',
        hasChildren: true,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: false,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.oBrace')).toBeTruthy()
      expect(container.querySelector('.cBrace')).toBeTruthy()
      expect(container.textContent).not.toContain('item') // No size for empty
    })
  })

  describe('Array nodes', () => {
    test('renders collapsed array with size annotation', () => {
      const node: FlatNode = {
        id: '$.items',
        depth: 1,
        key: 'items',
        value: [1, 2, 3],
        type: 'array',
        path: '$.items',
        hasChildren: true,
        isExpanded: false,
        childCount: 3,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.oBracket')).toBeTruthy()
      expect(container.querySelector('.ellipsis')).toBeTruthy()
      expect(container.querySelector('.cBracket')).toBeTruthy()
      expect(container.textContent).toContain('3 items')
    })

    test('renders single item with singular "item"', () => {
      const node: FlatNode = {
        id: '$.data',
        depth: 1,
        key: 'data',
        value: [1],
        type: 'array',
        path: '$.data',
        hasChildren: true,
        isExpanded: false,
        childCount: 1,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.textContent).toContain('1 item')
      expect(container.querySelector('.size')?.textContent).toContain('1 item')
    })

    test('renders empty array', () => {
      const node: FlatNode = {
        id: '$.data',
        depth: 1,
        key: 'data',
        value: [],
        type: 'array',
        path: '$.data',
        hasChildren: true,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: false,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.oBracket')).toBeTruthy()
      expect(container.querySelector('.cBracket')).toBeTruthy()
      expect(container.textContent).not.toContain('item') // No size for empty
    })
  })

  describe('Closing nodes', () => {
    test('renders closing brace for object', () => {
      const node: FlatNode = {
        id: '$__close',
        depth: 0,
        key: null,
        value: null as any,
        type: 'object_close' as any,
        path: '$__close',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: -1,
        isLastSibling: true,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.cBrace')?.textContent).toBe('}')
      expect(container.querySelector('.comma')).toBeNull() // Last sibling
    })

    test('renders closing bracket for array', () => {
      const node: FlatNode = {
        id: '$.items__close',
        depth: 1,
        key: null,
        value: null as any,
        type: 'array_close' as any,
        path: '$.items__close',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: -1,
        isLastSibling: false,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.cBracket')?.textContent).toBe(']')
      expect(container.querySelector('.comma')).toBeTruthy() // Not last sibling
    })
  })

  describe('Interaction', () => {
    test('calls onToggle when expander is clicked', () => {
      const mockToggle = vi.fn()
      const node: FlatNode = {
        id: '$.users',
        depth: 1,
        key: 'users',
        value: [],
        type: 'array',
        path: '$.users',
        hasChildren: true,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      const expander = container.querySelector('.e') as HTMLElement
      fireEvent.click(expander)

      expect(mockToggle).toHaveBeenCalledWith('$.users')
    })

    test('calls onToggle with expandAllSiblings on Cmd+Click', () => {
      const mockToggle = vi.fn()
      const node: FlatNode = {
        id: '$.users',
        depth: 1,
        key: 'users',
        value: {},
        type: 'object',
        path: '$.users',
        hasChildren: true,
        isExpanded: false,
        childCount: 2,
        indexInParent: 0,
        isLastSibling: false,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      const expander = container.querySelector('.e') as HTMLElement
      fireEvent.click(expander, { metaKey: true })

      expect(mockToggle).toHaveBeenCalledWith('$.users', {
        expandAllSiblings: true,
      })
    })
  })

  describe('Keys and commas', () => {
    test('object properties have keys', () => {
      const node: FlatNode = {
        id: '$.name',
        depth: 1,
        key: 'name',
        value: 'Alice',
        type: 'string',
        path: '$.name',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: false,
        displayValue: 'Alice',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.k')?.textContent).toBe('name')
      expect(container.querySelector('.colon')).toBeTruthy()
      expect(container.classList.contains('objProp')).toBe(false) // On .entry
      expect(container.querySelector('.entry')?.classList.contains('objProp')).toBe(
        true
      )
    })

    test('array elements do not have keys', () => {
      const node: FlatNode = {
        id: '$.items[0]',
        depth: 2,
        key: null,
        value: 42,
        type: 'number',
        path: '$.items[0]',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: false,
        displayValue: '42',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.k')).toBeNull()
      expect(container.querySelector('.colon')).toBeNull()
      expect(container.querySelector('.entry')?.classList.contains('arrElem')).toBe(
        true
      )
    })

    test('does not render comma for last sibling', () => {
      const node: FlatNode = {
        id: '$.last',
        depth: 1,
        key: 'last',
        value: 42,
        type: 'number',
        path: '$.last',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 2,
        isLastSibling: true,
        displayValue: '42',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.comma')).toBeNull()
    })

    test('renders comma for non-last sibling', () => {
      const node: FlatNode = {
        id: '$.first',
        depth: 1,
        key: 'first',
        value: 42,
        type: 'number',
        path: '$.first',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: false,
        displayValue: '42',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.comma')).toBeTruthy()
    })
  })

  describe('URL linkification', () => {
    test('linkifies https URLs', () => {
      const node: FlatNode = {
        id: '$.url',
        depth: 1,
        key: 'url',
        value: 'https://example.com',
        type: 'string',
        path: '$.url',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: 'https://example.com',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      const link = container.querySelector('a')
      expect(link?.getAttribute('href')).toBe('https://example.com')
      expect(link?.getAttribute('target')).toBe('_blank')
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
    })

    test('linkifies http URLs', () => {
      const node: FlatNode = {
        id: '$.url',
        depth: 1,
        key: 'url',
        value: 'http://example.com',
        type: 'string',
        path: '$.url',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: 'http://example.com',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      const link = container.querySelector('a')
      expect(link?.getAttribute('href')).toBe('http://example.com')
    })

    test('linkifies relative URLs', () => {
      const node: FlatNode = {
        id: '$.path',
        depth: 1,
        key: 'path',
        value: '/api/users',
        type: 'string',
        path: '$.path',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: '/api/users',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      const link = container.querySelector('a')
      expect(link?.getAttribute('href')).toBe('/api/users')
    })

    test('does not linkify non-URL strings', () => {
      const node: FlatNode = {
        id: '$.name',
        depth: 1,
        key: 'name',
        value: 'Alice',
        type: 'string',
        path: '$.name',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: 'Alice',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('a')).toBeNull()
    })
  })

  describe('Styling and indentation', () => {
    test('applies correct indentation based on depth', () => {
      const node: FlatNode = {
        id: '$.a.b.c',
        depth: 3,
        key: 'c',
        value: 1,
        type: 'number',
        path: '$.a.b.c',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: '1',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      const entry = container.querySelector('.entry') as HTMLElement
      expect(entry.style.paddingLeft).toBe('60px') // 3 * 20
    })

    test('applies custom style', () => {
      const node: FlatNode = {
        id: '$.a',
        depth: 1,
        key: 'a',
        value: 1,
        type: 'number',
        path: '$.a',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: '1',
      }

      const customStyle = { color: 'red', fontSize: '16px' }
      const { container } = render(
        <JsonNode node={node} onToggle={mockToggle} style={customStyle} />
      )

      const entry = container.querySelector('.entry') as HTMLElement
      expect(entry.style.color).toBe('red')
      expect(entry.style.fontSize).toBe('16px')
    })

    test('adds collapsed class for collapsed nodes', () => {
      const node: FlatNode = {
        id: '$.obj',
        depth: 1,
        key: 'obj',
        value: {},
        type: 'object',
        path: '$.obj',
        hasChildren: true,
        isExpanded: false,
        childCount: 2,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.entry')?.classList.contains('collapsed')).toBe(
        true
      )
    })

    test('does not add collapsed class for expanded nodes', () => {
      const node: FlatNode = {
        id: '$.obj',
        depth: 1,
        key: 'obj',
        value: {},
        type: 'object',
        path: '$.obj',
        hasChildren: true,
        isExpanded: true,
        childCount: 2,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      expect(container.querySelector('.entry')?.classList.contains('collapsed')).toBe(
        false
      )
    })
  })

  describe('ARIA attributes', () => {
    test('sets aria-expanded for expandable nodes', () => {
      const node: FlatNode = {
        id: '$.obj',
        depth: 1,
        key: 'obj',
        value: {},
        type: 'object',
        path: '$.obj',
        hasChildren: true,
        isExpanded: false,
        childCount: 2,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      const entry = container.querySelector('.entry')
      expect(entry?.getAttribute('aria-expanded')).toBe('false')
    })

    test('sets aria-expanded=true for expanded nodes', () => {
      const node: FlatNode = {
        id: '$.obj',
        depth: 1,
        key: 'obj',
        value: {},
        type: 'object',
        path: '$.obj',
        hasChildren: true,
        isExpanded: true,
        childCount: 2,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: null,
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      const entry = container.querySelector('.entry')
      expect(entry?.getAttribute('aria-expanded')).toBe('true')
    })

    test('does not set aria-expanded for non-expandable nodes', () => {
      const node: FlatNode = {
        id: '$.num',
        depth: 1,
        key: 'num',
        value: 42,
        type: 'number',
        path: '$.num',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: '42',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      const entry = container.querySelector('.entry')
      expect(entry?.hasAttribute('aria-expanded')).toBe(false)
    })

    test('sets role=treeitem', () => {
      const node: FlatNode = {
        id: '$.a',
        depth: 1,
        key: 'a',
        value: 1,
        type: 'number',
        path: '$.a',
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: 0,
        isLastSibling: true,
        displayValue: '1',
      }

      const { container } = render(<JsonNode node={node} onToggle={mockToggle} />)

      const entry = container.querySelector('.entry')
      expect(entry?.getAttribute('role')).toBe('treeitem')
    })
  })
})
