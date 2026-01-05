// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderNumber } from '../../../src/lib/renderers/numbers'

describe('Number Renderer', () => {
  it('renders positive integers', () => {
    const el = renderNumber(42)
    expect(el.className).toBe('n')
    expect(el.textContent).toBe('42')
  })

  it('renders negative integers', () => {
    const el = renderNumber(-123)
    expect(el.className).toBe('n')
    expect(el.textContent).toBe('-123')
  })

  it('renders zero', () => {
    const el = renderNumber(0)
    expect(el.className).toBe('n')
    expect(el.textContent).toBe('0')
  })

  it('renders floating point numbers', () => {
    const el = renderNumber(3.14159)
    expect(el.className).toBe('n')
    expect(el.textContent).toBe('3.14159')
  })

  it('renders very large numbers', () => {
    const el = renderNumber(9007199254740991) // Number.MAX_SAFE_INTEGER
    expect(el.className).toBe('n')
    expect(el.textContent).toBe('9007199254740991')
  })

  it('renders very small numbers', () => {
    const el = renderNumber(0.0000001)
    expect(el.className).toBe('n')
    expect(el.textContent).toBe('1e-7')
  })

  it('renders negative zero', () => {
    const el = renderNumber(-0)
    expect(el.className).toBe('n')
    expect(el.textContent).toBe('0')
  })
})
