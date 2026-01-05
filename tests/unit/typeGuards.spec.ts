import { describe, it, expect } from 'vitest'
import { isJsonArray, isJsonObject } from '../../src/lib/getValueType'

describe('Type Guards', () => {
  describe('isJsonArray', () => {
    it('returns true for arrays', () => {
      expect(isJsonArray([])).toBe(true)
      expect(isJsonArray([1, 2, 3])).toBe(true)
      expect(isJsonArray(['a', 'b'])).toBe(true)
    })

    it('returns false for objects', () => {
      expect(isJsonArray({})).toBe(false)
      expect(isJsonArray({ a: 1 })).toBe(false)
    })

    it('returns false for null', () => {
      expect(isJsonArray(null)).toBe(false)
    })

    it('returns false for primitives', () => {
      expect(isJsonArray('string' as any)).toBe(false)
      expect(isJsonArray(123 as any)).toBe(false)
      expect(isJsonArray(true as any)).toBe(false)
    })
  })

  describe('isJsonObject', () => {
    it('returns true for objects', () => {
      expect(isJsonObject({ a: 1 })).toBe(true)
      expect(isJsonObject({})).toBe(true)
      expect(isJsonObject({ nested: { a: 1 } })).toBe(true)
    })

    it('returns false for arrays', () => {
      expect(isJsonObject([])).toBe(false)
      expect(isJsonObject([1, 2, 3])).toBe(false)
    })

    it('returns false for null', () => {
      expect(isJsonObject(null as any)).toBe(false)
    })

    it('returns false for primitives', () => {
      expect(isJsonObject('string' as any)).toBe(false)
      expect(isJsonObject(123 as any)).toBe(false)
      expect(isJsonObject(true as any)).toBe(false)
    })
  })
})
