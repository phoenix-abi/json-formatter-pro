/**
 * Performance Regression Smoke Tests
 *
 * Quick smoke tests to catch catastrophic performance regressions.
 * These run as part of the standard test suite (npm test) and should complete in < 5 seconds.
 *
 * For comprehensive performance benchmarking, use: npm run test:perf
 */

import { describe, it, expect } from 'vitest'
import { parse as customParse } from '../../src/lib/parser/parse'

describe('Performance Regression Smoke Tests', () => {
  describe('Parser Performance', () => {
    it('should parse 1KB JSON in reasonable time', () => {
      const json = JSON.stringify({
        user: { id: 1, name: 'Test', email: 'test@example.com' },
        items: Array.from({ length: 20 }, (_, i) => ({ id: i, value: i * 2 }))
      })

      const start = performance.now()
      customParse(json)
      const elapsed = performance.now() - start

      // Should complete in < 5ms (very conservative threshold)
      expect(elapsed).toBeLessThan(5)
    })

    it('should parse 10KB JSON in reasonable time', () => {
      const json = JSON.stringify({
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          active: i % 2 === 0
        }))
      })

      const start = performance.now()
      customParse(json)
      const elapsed = performance.now() - start

      // Should complete in < 20ms (very conservative threshold)
      expect(elapsed).toBeLessThan(20)
    })

    it('should parse deeply nested JSON in reasonable time', () => {
      let obj: any = { leaf: 'value' }
      for (let i = 0; i < 50; i++) {
        obj = { level: i, child: obj }
      }
      const json = JSON.stringify(obj)

      const start = performance.now()
      customParse(json)
      const elapsed = performance.now() - start

      // Should complete in < 5ms (very conservative threshold)
      expect(elapsed).toBeLessThan(5)
    })
  })

  describe('Parser vs Native Comparison', () => {
    it('should not be catastrophically slower than JSON.parse', () => {
      const json = JSON.stringify({
        data: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          value: Math.random() * 1000,
          label: `Item ${i}`
        }))
      })

      // Warmup
      for (let i = 0; i < 5; i++) {
        JSON.parse(json)
        customParse(json)
      }

      // Benchmark native
      const nativeStart = performance.now()
      for (let i = 0; i < 10; i++) {
        JSON.parse(json)
      }
      const nativeTime = performance.now() - nativeStart

      // Benchmark custom
      const customStart = performance.now()
      for (let i = 0; i < 10; i++) {
        customParse(json)
      }
      const customTime = performance.now() - customStart

      const slowdown = customTime / nativeTime

      // Should not be more than 50x slower (catastrophic regression threshold)
      // Normal expected slowdown is 5-10x
      expect(slowdown).toBeLessThan(50)
    })
  })
})
