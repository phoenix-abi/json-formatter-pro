// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderNull } from '../../../src/lib/renderers/nulls'

describe('Null Renderer', () => {
  it('renders null', () => {
    const el = renderNull()
    expect(el.className).toBe('nl')
    expect(el.textContent).toBe('null')
  })

  it('returns HTMLSpanElement', () => {
    const el = renderNull()
    expect(el.tagName).toBe('SPAN')
  })

  it('creates independent instances', () => {
    const el1 = renderNull()
    const el2 = renderNull()
    expect(el1).not.toBe(el2)
  })
})
