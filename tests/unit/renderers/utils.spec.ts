import { describe, it, expect } from 'vitest'
import {
  getCollectionSize,
  hasEntries,
  hasOwn,
} from '../../../src/lib/renderers/utils'

describe('Renderer Utils', () => {
  describe('hasOwn', () => {
    it('returns true for own properties', () => {
      const obj = { a: 1, b: 2 }
      expect(hasOwn(obj, 'a')).toBe(true)
      expect(hasOwn(obj, 'b')).toBe(true)
    })

    it('returns false for inherited properties', () => {
      const obj = Object.create({ inherited: true })
      expect(hasOwn(obj, 'inherited')).toBe(false)
    })

    it('returns false for non-existent properties', () => {
      const obj = { a: 1 }
      expect(hasOwn(obj, 'b')).toBe(false)
    })
  })

  describe('getCollectionSize', () => {
    it('returns array length', () => {
      expect(getCollectionSize([1, 2, 3])).toBe(3)
      expect(getCollectionSize([])).toBe(0)
      expect(getCollectionSize(['a', 'b'])).toBe(2)
    })

    it('returns object key count', () => {
      expect(getCollectionSize({ a: 1 })).toBe(1)
      expect(getCollectionSize({ a: 1, b: 2, c: 3 })).toBe(3)
      expect(getCollectionSize({})).toBe(0)
    })

    it('returns 0 for primitives', () => {
      expect(getCollectionSize('x' as any)).toBe(0)
      expect(getCollectionSize(123 as any)).toBe(0)
      expect(getCollectionSize(true as any)).toBe(0)
      expect(getCollectionSize(null as any)).toBe(0)
    })
  })

  describe('hasEntries', () => {
    it('returns true for non-empty arrays', () => {
      expect(hasEntries([1])).toBe(true)
      expect(hasEntries([1, 2, 3])).toBe(true)
    })

    it('returns false for empty arrays', () => {
      expect(hasEntries([])).toBe(false)
    })

    it('returns true for non-empty objects', () => {
      expect(hasEntries({ a: 1 })).toBe(true)
      expect(hasEntries({ a: 1, b: 2 })).toBe(true)
    })

    it('returns false for empty objects', () => {
      expect(hasEntries({} as any)).toBe(false)
    })

    it('returns false for primitives', () => {
      expect(hasEntries('string' as any)).toBe(false)
      expect(hasEntries(123 as any)).toBe(false)
      expect(hasEntries(true as any)).toBe(false)
      expect(hasEntries(null as any)).toBe(false)
    })
  })
})
