// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { buildDom } from '../../src/lib/buildDom'
import type { JsonValue } from '../../src/lib/types'

describe('buildDom Contract Tests', () => {
  const render = (value: JsonValue, key: string | false = false) => {
    return buildDom(value, key).outerHTML
  }

  describe('Primitives', () => {
    it('renders strings with quotes and s class', () => {
      const html = render('x')
      expect(html).toContain('<span class="s">')
      expect(html).toContain('x')
      // Quotes are separate text nodes
      expect(html).toMatch(/".*x.*"/)
    })

    it('renders numbers with n class', () => {
      const html = render(1)
      expect(html).toContain('<span class="n">1</span>')
    })

    it('renders negative numbers', () => {
      const html = render(-42)
      expect(html).toContain('-42')
    })

    it('renders decimals', () => {
      const html = render(3.14)
      expect(html).toContain('3.14')
    })

    it('renders true with bl class', () => {
      const html = render(true)
      expect(html).toContain('class="bl"')
      expect(html).toContain('true')
    })

    it('renders false with bl class', () => {
      const html = render(false)
      expect(html).toContain('class="bl"')
      expect(html).toContain('false')
    })

    it('renders null with nl class', () => {
      const html = render(null)
      expect(html).toContain('class="nl"')
      expect(html).toContain('null')
    })
  })

  describe('Objects', () => {
    it('renders objects with keys, quotes, colon+nbsp, braces', () => {
      const html = render({ a: 1, b: 'x' })
      expect(html).toContain('class="e"') // expander when non-empty
      expect(html).toContain('{')
      expect(html).toContain('}')
      // Keys are wrapped in spans: "<span class="k">a</span>"
      expect(html).toContain('class="k">a</span>')
      expect(html).toContain('class="k">b</span>')
      expect(html).toMatch(/:(&nbsp;|\u00A0)/) // colon and nbsp (entity or char)
      expect(html).toMatch(/,/) // comma between entries
    })

    it('renders empty object without expander', () => {
      const html = render({})
      expect(html).not.toContain('class="e"')
      expect(html).toContain('{')
      expect(html).toContain('}')
    })

    it('renders nested objects', () => {
      const html = render({ outer: { inner: 1 } })
      expect(html).toContain('class="k">outer</span>')
      expect(html).toContain('class="k">inner</span>')
    })

    it('adds size data attribute', () => {
      const el = buildDom({ a: 1, b: 2, c: 3 }, false)
      expect(el.dataset.size).toMatch(/3\sitems/)
    })

    it('uses singular for single item', () => {
      const el = buildDom({ a: 1 }, false)
      expect(el.dataset.size).toMatch(/1\sitem/)
    })

    it('includes objProp class for object properties', () => {
      const html = render({ a: 1 }, 'key')
      expect(html).toContain('objProp')
    })
  })

  describe('Arrays', () => {
    it('renders arrays with brackets, commas, and size', () => {
      const el = buildDom([1, 2, 3], false)
      const html = el.outerHTML
      expect(html).toContain('[')
      expect(html).toContain(']')
      // exactly two commas for three elements
      expect(html.split(',').length - 1).toBe(2)
      expect(el.dataset.size).toMatch(/3\sitems/)
    })

    it('renders empty array without expander', () => {
      const html = render([])
      expect(html).not.toContain('class="e"')
      expect(html).toContain('[')
      expect(html).toContain(']')
    })

    it('renders nested arrays', () => {
      const html = render([[1, 2], [3, 4]])
      expect(html).toContain('[')
      expect(html).toContain(']')
    })

    it('includes arrElem class for array elements', () => {
      const html = render([1])
      expect(html).toContain('arrElem')
    })

    it('uses singular for single item array', () => {
      const el = buildDom([1], false)
      expect(el.dataset.size).toMatch(/1\sitem/)
    })
  })

  describe('Keys and Entry Classes', () => {
    it('adds key preamble when keyName provided', () => {
      const html = render(123, 'myKey')
      expect(html).toContain('class="k">myKey</span>')
      expect(html).toMatch(/:(&nbsp;|\u00A0)/)
      expect(html).toContain('objProp')
    })

    it('escapes special characters in keys', () => {
      const html = render(123, 'key"with"quotes')
      expect(html).toContain('\\"')
    })

    it('handles empty string keys', () => {
      const html = render(123, '')
      expect(html).toMatch(/:(&nbsp;|\u00A0)/)
      expect(html).toContain('objProp')
    })
  })

  describe('URLs and Links', () => {
    it('linkifies https URLs', () => {
      const html = render('https://example.com')
      expect(html).toContain('<a href="https://example.com"')
    })

    it('linkifies http URLs', () => {
      const html = render('http://example.com')
      expect(html).toContain('<a href="http://example.com"')
    })

    it('linkifies path URLs', () => {
      const html = render('/api/data')
      expect(html).toContain('<a href="/api/data"')
    })

    it('does not linkify non-URLs', () => {
      const html = render('just text')
      expect(html).not.toContain('<a')
    })
  })

  describe('Complex Structures', () => {
    it('renders mixed nested structures', () => {
      const data = {
        name: 'test',
        items: [1, 2, 3],
        nested: { a: true, b: null },
      }
      const html = render(data)

      expect(html).toContain('class="k">name</span>')
      expect(html).toContain('class="k">items</span>')
      expect(html).toContain('class="k">nested</span>')
      expect(html).toContain('true')
      expect(html).toContain('null')
    })

    it('preserves comma placement', () => {
      const el = buildDom({ a: 1, b: 2 }, false)
      const html = el.innerHTML

      // Should have exactly one comma between two properties
      const blockInner = el.querySelector('.blockInner')
      expect(blockInner).not.toBeNull()
      const innerHtml = blockInner!.innerHTML
      expect(innerHtml.split(',').length - 1).toBe(1)
    })
  })

  describe('Expanders', () => {
    it('adds expander to non-empty objects', () => {
      const html = render({ a: 1 })
      expect(html).toContain('class="e"')
    })

    it('adds expander to non-empty arrays', () => {
      const html = render([1])
      expect(html).toContain('class="e"')
    })

    it('does not add expander to empty objects', () => {
      const html = render({})
      expect(html).not.toContain('class="e"')
    })

    it('does not add expander to empty arrays', () => {
      const html = render([])
      expect(html).not.toContain('class="e"')
    })

    it('does not add expander to primitives', () => {
      expect(render('x')).not.toContain('class="e"')
      expect(render(1)).not.toContain('class="e"')
      expect(render(true)).not.toContain('class="e"')
      expect(render(null)).not.toContain('class="e"')
    })
  })
})
