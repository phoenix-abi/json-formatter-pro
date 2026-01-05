// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderBoolean } from '../../../src/lib/renderers/booleans'

describe('Boolean Renderer', () => {
  it('renders true', () => {
    const el = renderBoolean(true)
    expect(el.className).toBe('bl')
    expect(el.textContent).toBe('true')
  })

  it('renders false', () => {
    const el = renderBoolean(false)
    expect(el.className).toBe('bl')
    expect(el.textContent).toBe('false')
  })

  it('returns HTMLSpanElement for true', () => {
    const el = renderBoolean(true)
    expect(el.tagName).toBe('SPAN')
  })

  it('returns HTMLSpanElement for false', () => {
    const el = renderBoolean(false)
    expect(el.tagName).toBe('SPAN')
  })
})
