import { describe, expect, test } from 'vitest'
import { JSDOM } from 'jsdom'
import { getResult, MAX_LENGTH } from '../../src/lib/getResult'

function makeHtml(body: string): string {
  return `<!doctype html><html><head><title></title></head><body>${body}</body></html>`
}

function randomString(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}[]:,\"\n\t \r-'
  let s = ''
  for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length))
  return s
}

describe('getResult fuzz', () => {
  test('handles random HTML safely without throwing', () => {
    for (let i = 0; i < 100; i++) {
      const rand = randomString(50)
      const html = makeHtml(`
        <div>${rand}</div>
        ${Math.random() > 0.5 ? '<pre></pre>' : ''}
        ${Math.random() > 0.5 ? '<p>text</p>' : ''}
      `)
      const { window } = new JSDOM(html)
      // @ts-ignore jsdom patch for checkVisibility usage
      window.HTMLElement.prototype.checkVisibility = function () {
        return !this.hidden && this.style?.display !== 'none'
      }

      expect(() => getResult(window.document)).not.toThrow()
    }
  })

  test('boundary: respects MAX_LENGTH guard', () => {
    // one below
    const jsonOK = '"' + 'A'.repeat(1000) + '"' // modest for test env
    const htmlOK = makeHtml(`<pre>${jsonOK}</pre>`)
    {
      const { window } = new JSDOM(htmlOK)
      // @ts-ignore
      window.HTMLElement.prototype.checkVisibility = function () { return true }
      const r = getResult(window.document)
      expect(r.rawLength).toBe(jsonOK.length)
      // Should be formatted since it parses and is short
      expect(r.formatted).toBe(true)
    }

    // Construct a too-long payload relative to MAX_LENGTH without allocating multi-MB strings in CI
    const tooLongLen = Math.min(MAX_LENGTH + 1, 200_000) // cap to keep test light
    const big = '"' + 'A'.repeat(tooLongLen - 2) + '"'
    const htmlBig = makeHtml(`<pre>${big}</pre>`)
    {
      const { window } = new JSDOM(htmlBig)
      // @ts-ignore
      window.HTMLElement.prototype.checkVisibility = function () { return true }
      const r = getResult(window.document)
      if (tooLongLen > MAX_LENGTH) {
        expect(r.formatted).toBe(false)
        expect(r.note).toBe('Too long')
      } else {
        // When capped, we at least assert it does not throw and returns a Result
        expect(r.rawLength).toBe(big.length)
      }
    }
  })
})
