import { describe, it, expect } from 'vitest'
import { tryParseJson } from '../../../src/lib/getResult/parse'

describe('Parse', () => {
  describe('tryParseJson', () => {
    it('parses valid JSON object', () => {
      const result = tryParseJson('{"a":1}')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.parsed).toEqual({ a: 1 })
      }
    })

    it('parses valid JSON array', () => {
      const result = tryParseJson('[1,2,3]')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.parsed).toEqual([1, 2, 3])
      }
    })

    it('parses JSON string', () => {
      const result = tryParseJson('"hello"')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.parsed).toBe('hello')
      }
    })

    it('parses JSON number', () => {
      const result = tryParseJson('42')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.parsed).toBe(42)
      }
    })

    it('parses JSON boolean', () => {
      const result = tryParseJson('true')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.parsed).toBe(true)
      }
    })

    it('parses JSON null', () => {
      const result = tryParseJson('null')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.parsed).toBe(null)
      }
    })

    it('fails on invalid JSON', () => {
      const result = tryParseJson('{invalid}')
      expect(result.ok).toBe(false)
    })

    it('fails on unclosed braces', () => {
      const result = tryParseJson('{"a":1')
      expect(result.ok).toBe(false)
    })

    it('fails on unclosed brackets', () => {
      const result = tryParseJson('[1,2,3')
      expect(result.ok).toBe(false)
    })

    it('fails on trailing commas', () => {
      const result = tryParseJson('{"a":1,}')
      expect(result.ok).toBe(false)
    })

    it('fails on empty string', () => {
      const result = tryParseJson('')
      expect(result.ok).toBe(false)
    })

    it('handles complex nested JSON', () => {
      const json = '{"a":{"b":{"c":[1,2,3]}}}'
      const result = tryParseJson(json)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.parsed).toEqual({ a: { b: { c: [1, 2, 3] } } })
      }
    })
  })
})
