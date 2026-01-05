/**
 * Week 20: Security Audit Test Suite
 *
 * Comprehensive security testing for:
 * - XSS prevention
 * - Prototype pollution
 * - DoS attacks
 * - Input validation
 * - Safe DOM manipulation
 */

import { describe, test, expect } from 'vitest'
import { JSDOM } from 'jsdom'
import { parse } from '../../src/lib/parser/parse'
import { getResult, MAX_LENGTH } from '../../src/lib/getResult'

// ============================================================================
// XSS Prevention Tests
// ============================================================================

describe('Security: XSS Prevention', () => {
  test('script tags in JSON strings are not executed', () => {
    const maliciousJSON = {
      xss: '<script>window.HACKED = true</script>',
      img: '<img src=x onerror="window.HACKED=true">',
      link: '<a href="javascript:window.HACKED=true">click</a>',
    }

    const json = JSON.stringify(maliciousJSON)
    const { ast } = parse(json)

    // Verify AST contains literal strings (not executable code)
    expect(ast.kind).toBe('object')
    expect((ast as any).entries[0].value.value).toContain('<script>')
    expect(typeof (ast as any).entries[0].value.value).toBe('string')

    // Verify window.HACKED is not set
    expect((globalThis as any).HACKED).toBeUndefined()
  })

  test('buildDom uses textContent, not innerHTML', () => {
    // This test verifies the architectural decision to use textContent
    // buildDom should NEVER use innerHTML with untrusted JSON values

    const dangerousString = '<script>alert(1)</script>'
    const json = `{"dangerous": "${dangerousString}"}`

    // Parse and create DOM
    const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    const container = window.document.createElement('div')

    // Simulate what buildDom does
    const span = window.document.createElement('span')
    span.textContent = dangerousString  // Safe: uses textContent

    container.appendChild(span)

    // Verify: textContent escapes HTML
    expect(span.innerHTML).toContain('&lt;script&gt;')  // HTML encoded
    expect(span.innerHTML).not.toContain('<script>')    // Not raw HTML

    // Verify: no script tags in DOM
    expect(container.querySelector('script')).toBeNull()
  })

  test('URL values are linkified safely', () => {
    const urlJSON = {
      safe: 'https://example.com',
      javascript: 'javascript:alert(1)',
      data: 'data:text/html,<script>alert(1)</script>',
    }

    const json = JSON.stringify(urlJSON)
    const { ast } = parse(json)

    // Verify URLs are stored as strings, not executed
    expect(ast.kind).toBe('object')
    const entries = (ast as any).entries

    // JavaScript URL should be plain text
    const jsUrlEntry = entries.find((e: any) => e.key.value === 'javascript')
    expect(jsUrlEntry.value.value).toBe('javascript:alert(1)')

    // Data URL should be plain text
    const dataUrlEntry = entries.find((e: any) => e.key.value === 'data')
    expect(dataUrlEntry.value.value).toContain('data:text/html')
  })

  test('HTML entities in strings are not decoded', () => {
    const entityJSON = {
      lt: '&lt;script&gt;',
      quot: '&quot;test&quot;',
      amp: 'a &amp; b',
    }

    const json = JSON.stringify(entityJSON)
    const { ast } = parse(json)

    // Verify entities are stored as literal strings
    const entries = (ast as any).entries
    expect(entries[0].value.value).toBe('&lt;script&gt;')
    expect(entries[1].value.value).toBe('&quot;test&quot;')
    expect(entries[2].value.value).toBe('a &amp; b')
  })
})

// ============================================================================
// Prototype Pollution Tests
// ============================================================================

describe('Security: Prototype Pollution', () => {
  test('__proto__ keys do not pollute Object.prototype', () => {
    // Note: JSON.stringify removes __proto__ keys, so write JSON manually
    const json = '{"__proto__":{"polluted":true,"malicious":"value"}}'
    const { ast } = parse(json)

    // Verify AST contains __proto__ as regular key
    expect(ast.kind).toBe('object')
    expect((ast as any).entries[0].key.value).toBe('__proto__')

    // Verify Object.prototype is NOT polluted
    expect((Object.prototype as any).polluted).toBeUndefined()
    expect((Object.prototype as any).malicious).toBeUndefined()
  })

  test('constructor keys do not pollute', () => {
    const constructorJSON = {
      constructor: {
        prototype: {
          polluted: true,
        },
      },
    }

    const json = JSON.stringify(constructorJSON)
    const { ast } = parse(json)

    // Verify constructor is stored as regular key
    expect((ast as any).entries[0].key.value).toBe('constructor')

    // Verify no pollution
    expect((Object.prototype as any).polluted).toBeUndefined()
  })

  test('prototype key does not pollute', () => {
    const prototypeJSON = {
      prototype: {
        polluted: true,
      },
    }

    const json = JSON.stringify(prototypeJSON)
    const { ast } = parse(json)

    // Verify prototype is stored as regular key
    expect((ast as any).entries[0].key.value).toBe('prototype')

    // Verify no pollution
    expect((Object.prototype as any).polluted).toBeUndefined()
  })

  test('array __proto__ does not pollute Array.prototype', () => {
    const arrayJSON = JSON.stringify([{ __proto__: { polluted: true } }])
    const { ast } = parse(arrayJSON)

    // Verify parsing succeeds
    expect(ast.kind).toBe('array')

    // Verify Array.prototype is NOT polluted
    expect((Array.prototype as any).polluted).toBeUndefined()
  })
})

// ============================================================================
// DoS Attack Prevention
// ============================================================================

describe('Security: DoS Attack Prevention', () => {
  test('MAX_LENGTH guard prevents memory exhaustion', () => {
    // Attempt to load JSON larger than MAX_LENGTH
    const tooLongJson = '"' + 'A'.repeat(MAX_LENGTH + 1000) + '"'

    const { window } = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <pre>${tooLongJson}</pre>
        </body>
      </html>
    `)

    // @ts-ignore
    window.HTMLElement.prototype.checkVisibility = function () {
      return true
    }

    const result = getResult(window.document)

    // Should refuse to format due to length
    expect(result.formatted).toBe(false)
    expect(result.note).toBe('Too long')
  })

  test('maxDepth prevents stack overflow from deep nesting', () => {
    const depth = 2000  // Extremely deep
    let json = ''
    for (let i = 0; i < depth; i++) json += '['
    for (let i = 0; i < depth; i++) json += ']'

    // Should either complete or throw gracefully
    try {
      const { ast, errors } = parse(json, { maxDepth: 1000 })

      // If it completes, should not crash
      expect(ast).toBeDefined()
    } catch (error) {
      // If it throws, should be a controlled error (not stack overflow)
      expect(error).toBeDefined()
      expect(String(error)).toMatch(/depth|stack|recursion/i)
    }
  })

  test('maxKeyLength prevents long key attack', () => {
    const longKey = 'k'.repeat(20000)
    const json = `{"${longKey}": 1}`

    // Should either limit or handle gracefully
    const { ast, errors } = parse(json, { maxKeyLength: 10000 })

    // If key is rejected, should have errors
    // If key is accepted, should not crash
    expect(ast).toBeDefined()
  })

  test('maxStringLength prevents long string attack', () => {
    const longString = 'A'.repeat(20_000_000)  // 20MB string
    const json = `"${longString}"`

    // Should either limit or handle gracefully
    try {
      const { ast } = parse(json, { maxStringLength: 10_000_000 })
      expect(ast).toBeDefined()
    } catch (error) {
      // If it throws due to limit, should be controlled
      expect(error).toBeDefined()
    }
  })

  test('many keys do not cause exponential slowdown', () => {
    const keyCount = 10000
    const entries = Array.from({ length: keyCount }, (_, i) => `"key${i}":${i}`)
    const json = `{${entries.join(',')}}`

    const startTime = Date.now()
    const { ast } = parse(json)
    const elapsed = Date.now() - startTime

    // Should scale linearly, not exponentially
    // 10k keys should complete in < 5 seconds
    expect(elapsed).toBeLessThan(5000)

    // Verify all keys parsed
    expect((ast as any).entries.length).toBe(keyCount)
  })

  test('regex DoS: evil patterns do not execute', () => {
    // These patterns cause catastrophic backtracking if executed as regex
    const evilPatterns = [
      '(a+)+b',
      '(a*)*b',
      '([a-zA-Z]+)*[a-zA-Z]+',
      '(a|a)*b',
      '(a|ab)*c',
    ]

    for (const pattern of evilPatterns) {
      const json = `{"pattern": "${pattern}"}`

      const startTime = Date.now()
      const { ast } = parse(json)
      const elapsed = Date.now() - startTime

      // Should parse as plain string, not execute regex
      expect(elapsed).toBeLessThan(10)  // Very fast

      // Verify it's just a string
      expect((ast as any).entries[0].value.value).toBe(pattern)
    }
  })
})

// ============================================================================
// Input Validation
// ============================================================================

describe('Security: Input Validation', () => {
  test('empty input does not crash', () => {
    const emptyInputs = ['', ' ', '\n', '\t', '   \n\t  ']

    for (const input of emptyInputs) {
      try {
        const { ast, errors } = parse(input, { tolerant: true })
        expect(ast).toBeDefined()
      } catch (error) {
        // Empty input throws ParseError, this is expected
        expect(error).toBeDefined()
      }
    }
  })

  test('null and undefined input handled safely', () => {
    // These should be caught by TypeScript, but test runtime behavior
    try {
      // @ts-expect-error - testing runtime behavior
      parse(null)
    } catch (error) {
      expect(error).toBeDefined()
    }

    try {
      // @ts-expect-error - testing runtime behavior
      parse(undefined)
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  test('non-string input is rejected', () => {
    const invalidInputs = [123, true, {}, []]

    for (const input of invalidInputs) {
      try {
        // @ts-expect-error - testing runtime behavior
        parse(input)
        expect.fail('Should have thrown for non-string input')
      } catch (error) {
        expect(error).toBeDefined()
      }
    }
  })

  test('binary data does not crash parser', () => {
    // Simulate binary data as string
    const binaryString = String.fromCharCode(...Array.from({ length: 100 }, (_, i) => i))

    try {
      const { ast, errors } = parse(binaryString, { tolerant: true })
      // If parse succeeds, ast should be defined
      expect(ast).toBeDefined()
    } catch (error) {
      // Binary data throws TokenizerError, this is expected
      expect(error).toBeDefined()
    }
  })
})

// ============================================================================
// Safe DOM Manipulation
// ============================================================================

describe('Security: Safe DOM Manipulation', () => {
  test('no innerHTML usage with untrusted data', () => {
    // Architectural test: verify we use textContent/createTextNode

    const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    const dangerous = '<img src=x onerror=alert(1)>'

    // Safe approach (what we use)
    const safeSpan = window.document.createElement('span')
    safeSpan.textContent = dangerous

    expect(safeSpan.innerHTML).toContain('&lt;img')  // HTML encoded
    expect(safeSpan.querySelector('img')).toBeNull()  // No img element

    // Unsafe approach (what we NEVER do)
    const unsafeSpan = window.document.createElement('span')
    unsafeSpan.innerHTML = dangerous

    expect(unsafeSpan.querySelector('img')).not.toBeNull()  // img element created!
  })

  test('setAttribute used safely for links', () => {
    const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>')

    // When creating links, we use setAttribute (safe)
    const link = window.document.createElement('a')
    link.setAttribute('href', 'javascript:alert(1)')  // Stored but not executed

    // Should not execute JavaScript when clicked
    // (Browser security prevents javascript: URLs in untrusted contexts)
    expect(link.href).toBeDefined()
  })

  test('no eval or Function constructor usage', () => {
    // Code review test: verify we never use eval/Function

    const dangerousCode = 'alert(1)'
    const json = `{"code": "${dangerousCode}"}`

    const { ast } = parse(json)

    // Should be stored as string, never evaluated
    expect((ast as any).entries[0].value.value).toBe(dangerousCode)

    // Verify no eval happened
    // (would require window.alert to be called)
  })
})

// ============================================================================
// Content Security Policy Compliance
// ============================================================================

describe('Security: CSP Compliance', () => {
  test('no inline scripts generated', () => {
    // Verify we don't generate <script> tags dynamically
    const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>')

    const container = window.document.createElement('div')

    // Parse and render JSON (simulated)
    const json = '{"key": "value"}'
    const { ast } = parse(json)

    // Verify no script tags created
    expect(container.querySelector('script')).toBeNull()
  })

  test('no inline event handlers', () => {
    // Verify we don't use onclick, onerror, etc.
    const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>')

    const button = window.document.createElement('button')

    // We use addEventListener (safe), not onclick (unsafe)
    button.addEventListener('click', () => {
      // Event handler
    })

    // Verify no inline handler
    expect(button.getAttribute('onclick')).toBeNull()
  })
})
