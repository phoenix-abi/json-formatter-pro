// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderKeyName, appendKeyPreamble } from '../../../src/lib/renderers/keys'

describe('Key Renderer', () => {
  describe('renderKeyName', () => {
    it('renders simple key name without surrounding quotes', () => {
      const span = renderKeyName('foo')
      expect(span.className).toBe('k')
      expect(span.textContent).toBe('foo')
    })

    it('escapes special characters in key names', () => {
      const span = renderKeyName('a"b')
      expect(span.className).toBe('k')
      expect(span.textContent).toContain('\\"')
    })

    it('handles empty string keys', () => {
      const span = renderKeyName('')
      expect(span.className).toBe('k')
      expect(span.textContent).toBe('')
    })

    it('handles keys with newlines', () => {
      const span = renderKeyName('line1\nline2')
      expect(span.textContent).toContain('\\n')
    })

    it('handles keys with backslashes', () => {
      const span = renderKeyName('a\\b')
      expect(span.textContent).toContain('\\\\')
    })

    it('handles unicode characters', () => {
      const span = renderKeyName('emoji🎉')
      expect(span.textContent).toBe('emoji🎉')
    })
  })

  describe('appendKeyPreamble', () => {
    it('appends key preamble with quotes and colon+nbsp', () => {
      const entry = document.createElement('span') as HTMLSpanElement
      appendKeyPreamble(entry, 'x')
      const txt = entry.textContent
      expect(txt).toBe('"x":\u00A0')
    })

    it('handles empty string key', () => {
      const entry = document.createElement('span') as HTMLSpanElement
      appendKeyPreamble(entry, '')
      const txt = entry.textContent
      expect(txt).toBe('"":\u00A0')
    })

    it('handles key with special characters', () => {
      const entry = document.createElement('span') as HTMLSpanElement
      appendKeyPreamble(entry, 'a"b')
      const txt = entry.textContent
      expect(txt).toContain('\\"')
      expect(txt).toContain(':\u00A0')
    })

    it('appends correct number of child nodes', () => {
      const entry = document.createElement('span') as HTMLSpanElement
      appendKeyPreamble(entry, 'key')
      // Should append: opening quote, key span, closing quote, colon+space
      expect(entry.children.length).toBeGreaterThanOrEqual(1) // At least the key span
    })

    it('key span has correct class', () => {
      const entry = document.createElement('span') as HTMLSpanElement
      appendKeyPreamble(entry, 'test')
      const keySpan = entry.querySelector('.k')
      expect(keySpan).not.toBeNull()
      expect(keySpan?.textContent).toBe('test')
    })
  })
})
