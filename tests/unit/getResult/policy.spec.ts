import { describe, it, expect } from 'vitest'
import {
  startsLikeJson,
  isTooLong,
  MAX_LENGTH,
} from '../../../src/lib/getResult/policy'

describe('Policy', () => {
  describe('startsLikeJson', () => {
    it('detects objects', () => {
      expect(startsLikeJson('{')).toBe(true)
      expect(startsLikeJson('   {')).toBe(true)
      expect(startsLikeJson('\n\t{')).toBe(true)
      expect(startsLikeJson('\r\n  {')).toBe(true)
    })

    it('detects arrays', () => {
      expect(startsLikeJson('[')).toBe(true)
      expect(startsLikeJson('   [')).toBe(true)
      expect(startsLikeJson('\n\t[')).toBe(true)
    })

    it('detects strings', () => {
      expect(startsLikeJson('"x"')).toBe(true)
      expect(startsLikeJson('   "x"')).toBe(true)
      expect(startsLikeJson('\n\t"hello"')).toBe(true)
    })

    it('rejects non-JSON starts', () => {
      expect(startsLikeJson('no')).toBe(false)
      expect(startsLikeJson('true')).toBe(false)
      expect(startsLikeJson('false')).toBe(false)
      expect(startsLikeJson('null')).toBe(false)
      expect(startsLikeJson('123')).toBe(false)
      expect(startsLikeJson('')).toBe(false)
    })

    it('handles mixed whitespace', () => {
      expect(startsLikeJson('  \n\t  \r  {')).toBe(true)
      expect(startsLikeJson('\t\n\r\x20[')).toBe(true)
    })
  })

  describe('isTooLong', () => {
    it('detects length exceeding max', () => {
      expect(isTooLong(MAX_LENGTH + 1)).toBe(true)
      expect(isTooLong(MAX_LENGTH + 100)).toBe(true)
      expect(isTooLong(10_000_000)).toBe(true)
    })

    it('accepts length at or below max', () => {
      expect(isTooLong(MAX_LENGTH)).toBe(false)
      expect(isTooLong(MAX_LENGTH - 1)).toBe(false)
      expect(isTooLong(0)).toBe(false)
      expect(isTooLong(1000)).toBe(false)
    })

    it('accepts custom max length', () => {
      expect(isTooLong(100, 50)).toBe(true)
      expect(isTooLong(50, 50)).toBe(false)
      expect(isTooLong(49, 50)).toBe(false)
    })
  })

  describe('MAX_LENGTH constant', () => {
    it('has expected value', () => {
      expect(MAX_LENGTH).toBe(3_000_000)
    })
  })
})
