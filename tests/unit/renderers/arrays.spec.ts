// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderArrayElements } from '../../../src/lib/renderers/arrays'

describe('Array Elements Renderer', () => {
  const fakeRender = (v: any) => {
    const span = document.createElement('span')
    span.className = 'entry'
    span.textContent = String(v)
    return span as HTMLSpanElement
  }

  it('renders array elements with commas between', () => {
    const inner = renderArrayElements([1, 2], fakeRender)
    const html = inner.innerHTML

    // Exactly one comma between two entries
    expect(html.split(',').length - 1).toBe(1)
  })

  it('handles single element without trailing comma', () => {
    const inner = renderArrayElements([1], fakeRender)

    expect(inner.textContent?.trim()).toBe('1')
    expect(inner.textContent?.includes(',')).toBe(false)
  })

  it('handles empty array', () => {
    const inner = renderArrayElements([], fakeRender)

    expect(inner.children.length).toBe(0)
    expect(inner.textContent).toBe('')
  })

  it('preserves array order', () => {
    const inner = renderArrayElements([3, 1, 2], fakeRender)
    const values: string[] = []

    for (let i = 0; i < inner.children.length; i++) {
      const text = inner.children[i].textContent
      // Remove commas from textContent for comparison
      if (text) values.push(text.replace(',', ''))
    }

    expect(values).toEqual(['3', '1', '2'])
  })

  it('calls renderEntry for each element', () => {
    const calls: any[] = []
    const trackingRender = (v: any) => {
      calls.push(v)
      return fakeRender(v)
    }

    renderArrayElements([10, 20, 30], trackingRender)

    expect(calls).toEqual([10, 20, 30])
  })

  it('handles array with three elements', () => {
    const inner = renderArrayElements([1, 2, 3], fakeRender)
    const html = inner.innerHTML

    // Two commas between three elements
    expect(html.split(',').length - 1).toBe(2)
  })

  it('returns blockInner with correct class', () => {
    const inner = renderArrayElements([1], fakeRender)
    expect(inner.className).toBe('blockInner')
  })

  it('handles array of different types', () => {
    const inner = renderArrayElements(['a', 1, true, null], fakeRender)

    expect(inner.children.length).toBe(4)
    // Three commas between four elements
    expect(inner.innerHTML.split(',').length - 1).toBe(3)
  })
})
