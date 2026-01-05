// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getResult, MAX_LENGTH } from '../../src/lib/getResult'

describe('getResult Contract Tests', () => {
  let originalTitle: string

  beforeEach(() => {
    originalTitle = document.title
    document.body.innerHTML = ''
    document.title = ''
  })

  afterEach(() => {
    document.title = originalTitle
    document.body.innerHTML = ''
  })

  describe('Early Return Cases (formatted: false)', () => {
    it('returns specific note when title is set', () => {
      document.title = 'x'
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('document.title is contentful')
        expect(r.rawLength).toBe(null)
      }
    })

    it('returns specific note when multiple PREs exist', () => {
      document.body.innerHTML = '<pre>a</pre><pre>b</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('Multiple body > pre elements')
        expect(r.rawLength).toBe(null)
      }
    })

    it('returns specific note when textual elements present', () => {
      document.body.innerHTML = '<p>text</p>'
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('body contains textual elements')
        expect(r.rawLength).toBe(null)
      }
    })

    it('detects textual H1 elements', () => {
      document.body.innerHTML = '<h1>title</h1>'
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('body contains textual elements')
      }
    })

    it('returns specific note when no PRE exists', () => {
      document.body.innerHTML = ''
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('No body > pre')
        expect(r.rawLength).toBe(null)
      }
    })

    it('returns specific note when PRE is not rendered', () => {
      const pre = document.createElement('pre')
      ;(pre as any).checkVisibility = () => false
      document.body.appendChild(pre)
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('body > pre is not rendered')
        expect(r.rawLength).toBe(null)
      }
    })

    it('returns specific note when PRE content is empty', () => {
      document.body.innerHTML = '<pre></pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('No content in body > pre')
        expect(r.rawLength).toBe(0)
      }
    })

    it('returns specific note when content is too long', () => {
      const pre = document.createElement('pre')
      pre.textContent = '{' + 'x'.repeat(MAX_LENGTH) + '}'
      document.body.appendChild(pre)
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('Too long')
        expect(r.rawLength).toBeGreaterThan(MAX_LENGTH)
      }
    })

    it('returns specific note for bad start character (number)', () => {
      document.body.innerHTML = '<pre>  123</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('Does not start with { or [')
        expect(r.rawLength).toBe(5)
      }
    })

    it('returns specific note for bad start character (word)', () => {
      document.body.innerHTML = '<pre>hello</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('Does not start with { or [')
      }
    })

    it('returns specific note for bad start character (true)', () => {
      document.body.innerHTML = '<pre>true</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('Does not start with { or [')
      }
    })

    it('returns specific note for invalid JSON', () => {
      document.body.innerHTML = '<pre>{ x: 1 }</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('Does not parse as JSON')
        expect(r.rawLength).toBe(8)
      }
    })

    it('returns specific note for unclosed JSON', () => {
      document.body.innerHTML = '<pre>{"a":1</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('Does not parse as JSON')
      }
    })
  })

  describe('Success Cases (formatted: true)', () => {
    it('successfully parses valid JSON object', () => {
      document.body.innerHTML = '<pre>{"a":1}</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(true)
      if (r.formatted) {
        expect(r.note).toBe('done')
        expect(r.parsed).toEqual({ a: 1 })
        expect(r.element.tagName).toBe('PRE')
        expect(r.rawLength).toBe(7)
      }
    })

    it('successfully parses valid JSON array', () => {
      document.body.innerHTML = '<pre>[1,2,3]</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(true)
      if (r.formatted) {
        expect(r.parsed).toEqual([1, 2, 3])
        expect(r.rawLength).toBe(7)
      }
    })

    it('successfully parses JSON string', () => {
      document.body.innerHTML = '<pre>"hello"</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(true)
      if (r.formatted) {
        expect(r.parsed).toBe('hello')
      }
    })

    it('successfully parses JSON with leading whitespace', () => {
      document.body.innerHTML = '<pre>  \n\t{"a":1}</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(true)
      if (r.formatted) {
        expect(r.parsed).toEqual({ a: 1 })
      }
    })

    it('successfully parses complex nested JSON', () => {
      const json = '{"a":{"b":[1,2,3],"c":null}}'
      document.body.innerHTML = `<pre>${json}</pre>`
      const r = getResult(document)
      expect(r.formatted).toBe(true)
      if (r.formatted) {
        expect(r.parsed).toEqual({ a: { b: [1, 2, 3], c: null } })
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles PRE with non-textual siblings', () => {
      document.body.innerHTML = '<style>css</style><pre>{"a":1}</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(true)
      if (r.formatted) {
        expect(r.parsed).toEqual({ a: 1 })
      }
    })

    it('handles script tags as non-textual', () => {
      document.body.innerHTML = '<script>js</script><pre>{"a":1}</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(true)
      if (r.formatted) {
        expect(r.parsed).toEqual({ a: 1 })
      }
    })

    it('prioritizes textual detection over parsing', () => {
      document.body.innerHTML = '<p>text</p><pre>{"a":1}</pre>'
      const r = getResult(document)
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        expect(r.note).toBe('body contains textual elements')
      }
    })

    it('respects MAX_LENGTH boundary exactly', () => {
      const pre = document.createElement('pre')
      pre.textContent = '{' + 'x'.repeat(MAX_LENGTH - 2) + '}'
      document.body.appendChild(pre)
      const r = getResult(document)
      // Should not be "Too long" if exactly at MAX_LENGTH
      expect(r.formatted).toBe(false)
      if (!r.formatted) {
        // Will fail parsing, but not due to length
        expect(r.note).not.toBe('Too long')
      }
    })
  })

  describe('Return Value Structure', () => {
    it('has correct structure for success', () => {
      document.body.innerHTML = '<pre>{"a":1}</pre>'
      const r = getResult(document)
      expect(r).toHaveProperty('formatted')
      expect(r).toHaveProperty('note')
      expect(r).toHaveProperty('rawLength')
      if (r.formatted) {
        expect(r).toHaveProperty('element')
        expect(r).toHaveProperty('parsed')
      }
    })

    it('has correct structure for failure', () => {
      document.body.innerHTML = ''
      const r = getResult(document)
      expect(r).toHaveProperty('formatted')
      expect(r).toHaveProperty('note')
      expect(r).toHaveProperty('rawLength')
      if (!r.formatted) {
        expect(r).not.toHaveProperty('element')
        expect(r).not.toHaveProperty('parsed')
      }
    })
  })
})
