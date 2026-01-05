// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest'
import { findSingleBodyPre, isRendered } from '../../../src/lib/getResult/scan'

describe('Scan', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('findSingleBodyPre', () => {
    it('finds single PRE element', () => {
      document.body.innerHTML = '<pre>ok</pre>'
      const result = findSingleBodyPre(document)
      expect(result).not.toBe(null)
      expect(result).not.toBe('multiple')
      expect(result).not.toBe('textual')
      expect((result as HTMLPreElement).tagName).toBe('PRE')
    })

    it('detects multiple PRE elements', () => {
      document.body.innerHTML = '<pre>a</pre><pre>b</pre>'
      expect(findSingleBodyPre(document)).toBe('multiple')
    })

    it('detects textual P elements', () => {
      document.body.innerHTML = '<p>text</p>'
      expect(findSingleBodyPre(document)).toBe('textual')
    })

    it('detects textual H1 elements', () => {
      document.body.innerHTML = '<h1>title</h1>'
      expect(findSingleBodyPre(document)).toBe('textual')
    })

    it('detects textual H2-H6 elements', () => {
      document.body.innerHTML = '<h2>subtitle</h2>'
      expect(findSingleBodyPre(document)).toBe('textual')

      document.body.innerHTML = '<h3>heading</h3>'
      expect(findSingleBodyPre(document)).toBe('textual')

      document.body.innerHTML = '<h6>small heading</h6>'
      expect(findSingleBodyPre(document)).toBe('textual')
    })

    it('returns null when no PRE found', () => {
      document.body.innerHTML = '<div>not a pre</div>'
      expect(findSingleBodyPre(document)).toBe(null)
    })

    it('returns null for empty body', () => {
      document.body.innerHTML = ''
      expect(findSingleBodyPre(document)).toBe(null)
    })

    it('ignores non-textual elements and finds PRE', () => {
      document.body.innerHTML = '<style>css</style><pre>json</pre>'
      const result = findSingleBodyPre(document)
      expect(result).not.toBe('textual')
      expect((result as HTMLPreElement).tagName).toBe('PRE')
    })

    it('prioritizes textual detection over multiple PREs', () => {
      document.body.innerHTML = '<p>text</p><pre>a</pre><pre>b</pre>'
      expect(findSingleBodyPre(document)).toBe('textual')
    })
  })

  describe('isRendered', () => {
    it('returns true for rendered element', () => {
      const el = document.createElement('pre')
      document.body.appendChild(el)
      expect(isRendered(el)).toBe(true)
    })

    it('respects checkVisibility returning false', () => {
      const el = document.createElement('pre')
      // Mock checkVisibility
      ;(el as any).checkVisibility = () => false
      expect(isRendered(el)).toBe(false)
    })

    it('handles missing checkVisibility gracefully', () => {
      const el = document.createElement('pre')
      // Remove checkVisibility if it exists
      delete (el as any).checkVisibility
      expect(isRendered(el)).toBe(true)
    })
  })
})
