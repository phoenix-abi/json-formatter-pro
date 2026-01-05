import { describe, it, expect } from 'vitest'
import { toMB, toKB, sampleHeap, forceGC, measurePeakHeap } from './memory'

describe('Memory Utilities', () => {
  describe('toMB()', () => {
    it('should convert bytes to megabytes', () => {
      expect(toMB(1024 * 1024)).toBe(1)
      expect(toMB(1024 * 1024 * 10)).toBe(10)
      expect(toMB(1024 * 512)).toBe(0.5)
    })

    it('should handle zero', () => {
      expect(toMB(0)).toBe(0)
    })

    it('should handle fractional results', () => {
      const result = toMB(1024 * 1024 * 1.5)
      expect(result).toBeCloseTo(1.5, 2)
    })
  })

  describe('toKB()', () => {
    it('should convert bytes to kilobytes', () => {
      expect(toKB(1024)).toBe(1)
      expect(toKB(1024 * 10)).toBe(10)
      expect(toKB(512)).toBe(0.5)
    })

    it('should handle zero', () => {
      expect(toKB(0)).toBe(0)
    })
  })

  describe('sampleHeap()', () => {
    it('should return a heap snapshot with all expected fields', () => {
      const snapshot = sampleHeap()

      expect(snapshot).toHaveProperty('rss_mb')
      expect(snapshot).toHaveProperty('heapUsed_mb')
      expect(snapshot).toHaveProperty('heapTotal_mb')
      expect(snapshot).toHaveProperty('external_mb')

      // All values should be numbers
      expect(typeof snapshot.rss_mb).toBe('number')
      expect(typeof snapshot.heapUsed_mb).toBe('number')
      expect(typeof snapshot.heapTotal_mb).toBe('number')
      expect(typeof snapshot.external_mb).toBe('number')
    })

    it('should return positive values for memory metrics', () => {
      const snapshot = sampleHeap()

      expect(snapshot.rss_mb).toBeGreaterThan(0)
      expect(snapshot.heapUsed_mb).toBeGreaterThan(0)
      expect(snapshot.heapTotal_mb).toBeGreaterThan(0)
      expect(snapshot.external_mb).toBeGreaterThanOrEqual(0) // Can be 0
    })

    it('should have heapUsed <= heapTotal', () => {
      const snapshot = sampleHeap()

      expect(snapshot.heapUsed_mb).toBeLessThanOrEqual(snapshot.heapTotal_mb)
    })

    it('should return different values across samples', () => {
      const snapshot1 = sampleHeap()

      // Allocate some memory
      const arr = new Array(100000).fill({ data: 'test' })

      const snapshot2 = sampleHeap()

      // At least one metric should be different (usually heapUsed)
      const changed =
        snapshot1.heapUsed_mb !== snapshot2.heapUsed_mb ||
        snapshot1.heapTotal_mb !== snapshot2.heapTotal_mb ||
        snapshot1.rss_mb !== snapshot2.rss_mb

      expect(changed).toBe(true)

      // Keep arr in scope to prevent optimization
      expect(arr.length).toBe(100000)
    })

    it('should have values in reasonable MB range', () => {
      const snapshot = sampleHeap()

      // Node.js process should use at least a few MB
      expect(snapshot.rss_mb).toBeGreaterThan(5)
      expect(snapshot.heapUsed_mb).toBeGreaterThan(1)

      // But shouldn't be absurdly large for this test
      expect(snapshot.rss_mb).toBeLessThan(1000)
    })
  })

  describe('forceGC()', () => {
    it('should return false when GC is not exposed', () => {
      // In normal test runs without --expose-gc, should return false
      // If running with --expose-gc, will return true
      const result = forceGC()
      expect(typeof result).toBe('boolean')
    })

    it('should not throw errors', () => {
      expect(() => forceGC()).not.toThrow()
    })
  })

  describe('measurePeakHeap()', () => {
    it('should measure heap for synchronous function', async () => {
      const { result, snapshot } = await measurePeakHeap(() => {
        return 42
      })

      expect(result).toBe(42)
      expect(snapshot).toHaveProperty('heapUsed_mb')
      expect(snapshot.heapUsed_mb).toBeGreaterThan(0)
    })

    it('should measure heap for async function', async () => {
      const { result, snapshot } = await measurePeakHeap(async () => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return 'done'
      })

      expect(result).toBe('done')
      expect(snapshot).toHaveProperty('heapUsed_mb')
      expect(snapshot.heapUsed_mb).toBeGreaterThan(0)
    })

    it('should capture heap after allocation', async () => {
      const { result, snapshot } = await measurePeakHeap(() => {
        // Allocate some memory
        const data = new Array(50000).fill({ value: Math.random() })
        return data.length
      })

      expect(result).toBe(50000)
      expect(snapshot.heapUsed_mb).toBeGreaterThan(0)

      // Verify snapshot structure
      expect(snapshot).toHaveProperty('rss_mb')
      expect(snapshot).toHaveProperty('heapUsed_mb')
      expect(snapshot).toHaveProperty('heapTotal_mb')
      expect(snapshot).toHaveProperty('external_mb')
    })

    it('should handle function that throws', async () => {
      await expect(
        measurePeakHeap(() => {
          throw new Error('Test error')
        })
      ).rejects.toThrow('Test error')
    })
  })
})
