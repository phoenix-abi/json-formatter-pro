// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest'
import {
  renderString,
  isLikelyUrl,
  escapeJsonStringForDisplay,
} from '../../../src/lib/renderers/strings'

describe('String Renderer', () => {
  beforeEach(() => {
    // Ensure clean DOM state for each test
    document.body.innerHTML = ''
  })

  describe('isLikelyUrl', () => {
    it('detects https URLs', () => {
      expect(isLikelyUrl('https://example.com')).toBe(true)
      expect(isLikelyUrl('https://a')).toBe(true)
    })

    it('detects http URLs', () => {
      expect(isLikelyUrl('http://example.com')).toBe(true)
      expect(isLikelyUrl('http://a')).toBe(true)
    })

    it('detects path URLs', () => {
      expect(isLikelyUrl('/path')).toBe(true)
      expect(isLikelyUrl('/api/data')).toBe(true)
    })

    it('returns false for non-URLs', () => {
      expect(isLikelyUrl('not a url')).toBe(false)
      expect(isLikelyUrl('ftp://example.com')).toBe(false)
      expect(isLikelyUrl('')).toBe(false)
    })
  })

  describe('escapeJsonStringForDisplay', () => {
    it('escapes JSON string content', () => {
      expect(escapeJsonStringForDisplay('a"b')).toContain('\\"')
      expect(escapeJsonStringForDisplay('line1\nline2')).toContain('\\n')
    })

    it('removes outer quotes', () => {
      const result = escapeJsonStringForDisplay('hello')
      expect(result).toBe('hello')
      expect(result.startsWith('"')).toBe(false)
      expect(result.endsWith('"')).toBe(false)
    })

    it('handles backslashes', () => {
      expect(escapeJsonStringForDisplay('a\\b')).toContain('\\\\')
    })
  })

  describe('renderString', () => {
    it('renders quoted string with link for URLs', () => {
      const el = renderString('https://example.com?q=a b')
      const html = el.outerHTML

      expect(html.startsWith('<span class="s">')).toBe(true)
      expect(html).toContain('<a href="https://example.com?q=a b"')
      expect(el.textContent).toContain('"') // opening quote
    })

    it('renders non-URL as text', () => {
      const el = renderString('hello')

      expect(el.querySelector('a')).toBeNull()
      expect(el.textContent).toBe('"hello"')
      expect(el.className).toBe('s')
    })

    it('renders empty string with quotes', () => {
      const el = renderString('')
      expect(el.textContent).toBe('""')
    })

    it('escapes special characters in non-URL strings', () => {
      const el = renderString('hello\nworld')
      expect(el.textContent).toContain('\\n')
    })

    it('creates link with correct href for URL strings', () => {
      const el = renderString('https://example.com/path')
      const link = el.querySelector('a')

      expect(link).not.toBeNull()
      expect(link?.href).toBe('https://example.com/path')
    })

    it('renders path URLs as links', () => {
      const el = renderString('/api/data')
      const link = el.querySelector('a')

      expect(link).not.toBeNull()
      expect(link?.href).toContain('/api/data')
    })
  })
})
