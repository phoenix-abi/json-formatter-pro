// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderObjectEntries } from '../../../src/lib/renderers/objects'
import type { JsonValue } from '../../../src/lib/types'

describe('Object Entries Renderer', () => {
  const fakeRender = (v: JsonValue, k: string) => {
    const span = document.createElement('span')
    span.className = 'entry'
    span.setAttribute('data-k', k)
    span.textContent = String(v as any)
    return span as HTMLSpanElement
  }

  it('renders object entries with commas between', () => {
    const inner = renderObjectEntries({ a: 1, b: 2 }, fakeRender)
    const html = inner.innerHTML

    expect(html).toContain('data-k="a"')
    expect(html).toContain('data-k="b"')

    // Only one comma text node between two entries
    expect(html.split(',').length - 1).toBe(1)
  })

  it('handles single entry without trailing comma', () => {
    const inner = renderObjectEntries({ a: 1 }, fakeRender)

    expect(inner.textContent?.trim()).toBe('1')
    expect(inner.textContent?.includes(',')).toBe(false)
  })

  it('handles empty object', () => {
    const inner = renderObjectEntries({}, fakeRender)

    expect(inner.children.length).toBe(0)
    expect(inner.textContent).toBe('')
  })

  it('preserves key order from Object.keys', () => {
    const inner = renderObjectEntries({ c: 3, a: 1, b: 2 }, fakeRender)
    const keys: string[] = []

    for (let i = 0; i < inner.children.length; i++) {
      const key = inner.children[i].getAttribute('data-k')
      if (key) keys.push(key)
    }

    expect(keys).toEqual(['c', 'a', 'b'])
  })

  it('calls renderEntry for each key-value pair', () => {
    const calls: Array<{ value: JsonValue; key: string }> = []
    const trackingRender = (v: JsonValue, k: string) => {
      calls.push({ value: v, key: k })
      return fakeRender(v, k)
    }

    renderObjectEntries({ x: 10, y: 20 }, trackingRender)

    expect(calls).toEqual([
      { value: 10, key: 'x' },
      { value: 20, key: 'y' },
    ])
  })

  it('handles object with three entries', () => {
    const inner = renderObjectEntries({ a: 1, b: 2, c: 3 }, fakeRender)
    const html = inner.innerHTML

    // Two commas between three entries
    expect(html.split(',').length - 1).toBe(2)
  })

  it('returns blockInner with correct class', () => {
    const inner = renderObjectEntries({ a: 1 }, fakeRender)
    expect(inner.className).toBe('blockInner')
  })
})
