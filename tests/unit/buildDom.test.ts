import { describe, expect, test, beforeEach } from 'vitest'
import { buildDom } from '../../src/lib/buildDom'
import { JSDOM } from 'jsdom'

// Helpers
const html = '<!doctype html><html><head></head><body></body></html>'

describe('buildDom', () => {
  beforeEach(() => {
    // fresh DOM for each test to avoid template reuse side‑effects
    const dom = new JSDOM(html)
    // @ts-ignore
    global.document = dom.window.document
    // @ts-ignore
    global.window = dom.window as any
  })

  test('renders simple primitives', () => {
    const s = buildDom('hello', false)
    expect(s.classList.contains('arrElem')).toBe(true)
    expect(s.querySelector('.s')).toBeTruthy()
    // quoted string rendered with dblqText around content
    const dblqs = s.querySelectorAll('span.s, .s, .n, .bl, .nl')
    expect(dblqs.length).toBeGreaterThan(0)

    const n = buildDom(123.45 as any, false)
    expect(n.querySelector('.n')?.textContent).toBe('123.45')

    const t = buildDom(true as any, false)
    expect(t.querySelector('.bl')?.textContent).toBe('true')

    const f = buildDom(false as any, false)
    expect(f.querySelector('.bl')?.textContent).toBe('false')

    const nl = buildDom(null as any, false)
    expect(nl.querySelector('.nl')?.textContent).toBe('null')
  })

  test('renders object with key names and expanders', () => {
    const obj = { a: 1, b: 2 }
    const span = buildDom(obj as any, 'root')

    // has object property class
    expect(span.classList.contains('objProp')).toBe(true)

    // expander exists for non-empty object
    expect(span.querySelector('.e')).toBeTruthy()

    // braces present and inner block container
    expect(span.textContent).toContain('{')
    expect(span.textContent).toContain('}')
    const inner = span.querySelector('.blockInner') as HTMLElement
    expect(inner).toBeTruthy()

    // child entries include keys a and b
    const keys = Array.from(span.querySelectorAll('.k')).map((el) => el.textContent)
    expect(keys).toContain('a')
    expect(keys).toContain('b')
  })

  test('renders array with indices and expanders', () => {
    const arr = [1, 2, 3]
    const span = buildDom(arr as any, false)

    // array element class on root entry
    expect(span.classList.contains('arrElem')).toBe(true)

    // expander exists for non-empty array
    expect(span.querySelector('.e')).toBeTruthy()

    // brackets present and inner block
    expect(span.textContent).toContain('[')
    expect(span.textContent).toContain(']')

    const entries = span.querySelectorAll('.entry')
    expect(entries.length).toBeGreaterThanOrEqual(3)
  })

  test('linkifies http/https and absolute-path strings only', () => {
    const http = buildDom('http://example.com', false)
    const https = buildDom('https://example.com', false)
    const abs = buildDom('/path/to', false)
    const other = buildDom('foo://bar', false)

    expect(http.querySelector('a')?.getAttribute('href')).toBe('http://example.com')
    expect(https.querySelector('a')?.getAttribute('href')).toBe('https://example.com')
    expect(abs.querySelector('a')?.getAttribute('href')).toBe('/path/to')

    expect(other.querySelector('a')).toBeNull()

    // Ensure text is escaped (no HTML injection)
    const hostile = buildDom('<b>bad</b>', false)
    // There should be no <b> inserted
    expect(hostile.querySelector('b')).toBeNull()
    // But text content should contain the angle brackets (escaped by text node assignment)
    expect(hostile.textContent).toContain('<b>bad</b>')
  })
})
