// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { templates, type Templates } from '../../../src/lib/templates'
import { renderString } from '../../../src/lib/renderers/strings'
import { renderNumber } from '../../../src/lib/renderers/numbers'
import { renderBoolean } from '../../../src/lib/renderers/booleans'
import { renderNull } from '../../../src/lib/renderers/nulls'
import { buildDom } from '../../../src/lib/buildDom'

describe('Templates Dependency Injection', () => {
  describe('renderString DI', () => {
    it('supports custom quote glyphs via DI', () => {
      const customTemplates: Templates = {
        ...templates,
        t_dblqText: {
          cloneNode: () => document.createTextNode("'"),
        },
      }

      const el = renderString('hi', customTemplates)
      expect(el.textContent).toBe("'hi'")
    })

    it('uses default templates when not provided', () => {
      const el = renderString('hello')
      expect(el.textContent).toBe('"hello"')
    })
  })

  describe('renderNumber DI', () => {
    it('supports custom number class via DI', () => {
      const customTemplates: Templates = {
        ...templates,
        t_number: {
          cloneNode: () => {
            const span = document.createElement('span')
            span.className = 'custom-number'
            return span
          },
        },
      }

      const el = renderNumber(42, customTemplates)
      expect(el.className).toBe('custom-number')
      expect(el.textContent).toBe('42')
    })
  })

  describe('renderBoolean DI', () => {
    it('supports custom boolean text via DI', () => {
      const customTemplates: Templates = {
        ...templates,
        t_true: {
          cloneNode: (deep?: boolean) => {
            const span = document.createElement('span')
            span.className = 'bl'
            span.textContent = 'YES'
            return span
          },
        },
      }

      const el = renderBoolean(true, customTemplates)
      expect(el.textContent).toBe('YES')
    })
  })

  describe('renderNull DI', () => {
    it('supports custom null text via DI', () => {
      const customTemplates: Templates = {
        ...templates,
        t_null: {
          cloneNode: (deep?: boolean) => {
            const span = document.createElement('span')
            span.className = 'nl'
            span.textContent = 'nil'
            return span
          },
        },
      }

      const el = renderNull(customTemplates)
      expect(el.textContent).toBe('nil')
    })
  })

  describe('buildDom DI', () => {
    it('threads custom templates through entire tree', () => {
      const customTemplates: Templates = {
        ...templates,
        t_oBrace: {
          cloneNode: (deep?: boolean) => {
            const span = document.createElement('span')
            span.className = 'b'
            span.textContent = '<<<'
            return span
          },
        },
        t_cBrace: {
          cloneNode: (deep?: boolean) => {
            const span = document.createElement('span')
            span.className = 'b'
            span.textContent = '>>>'
            return span
          },
        },
      }

      const el = buildDom({ a: 1 }, false, customTemplates)
      const html = el.outerHTML

      // outerHTML encodes < and > as entities
      expect(html).toContain('&lt;&lt;&lt;')
      expect(html).toContain('&gt;&gt;&gt;')
    })

    it('works without templates parameter (default behavior)', () => {
      const el = buildDom({ a: 1 }, false)
      const html = el.outerHTML

      expect(html).toContain('{')
      expect(html).toContain('}')
    })

    it('threads templates through nested structures', () => {
      const customTemplates: Templates = {
        ...templates,
        t_commaText: {
          cloneNode: () => document.createTextNode(';'),
        },
      }

      const el = buildDom({ a: 1, b: 2 }, false, customTemplates)
      const html = el.innerHTML

      // Should use semicolon instead of comma between entries
      expect(html).toContain(';')
      // Verify semicolons are present (there may be multiple in nested structures)
      expect(html.split(';').length).toBeGreaterThan(1)
    })

    it('threads templates through arrays', () => {
      const customTemplates: Templates = {
        ...templates,
        t_oBracket: {
          cloneNode: (deep?: boolean) => {
            const span = document.createElement('span')
            span.className = 'b'
            span.textContent = '('
            return span
          },
        },
        t_cBracket: {
          cloneNode: (deep?: boolean) => {
            const span = document.createElement('span')
            span.className = 'b'
            span.textContent = ')'
            return span
          },
        },
      }

      const el = buildDom([1, 2], false, customTemplates)
      const html = el.outerHTML

      expect(html).toContain('(')
      expect(html).toContain(')')
    })
  })

  describe('Type safety', () => {
    it('Templates type ensures all required templates exist', () => {
      // This test verifies that the Templates type is correctly defined
      const t: Templates = templates
      expect(t.t_entry).toBeDefined()
      expect(t.t_string).toBeDefined()
      expect(t.t_number).toBeDefined()
      expect(t.t_null).toBeDefined()
      expect(t.t_true).toBeDefined()
      expect(t.t_false).toBeDefined()
      expect(t.t_oBrace).toBeDefined()
      expect(t.t_cBrace).toBeDefined()
      expect(t.t_oBracket).toBeDefined()
      expect(t.t_cBracket).toBeDefined()
    })
  })
})
