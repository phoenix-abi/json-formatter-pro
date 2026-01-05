import { describe, it, expect } from 'vitest'
import { performance } from 'node:perf_hooks'
import { recordMetric } from './harness'

/**
 * Benchmark statistics
 */
interface BenchStats {
  avg: number
  p50: number
  p95: number
  p99: number
  min: number
  max: number
  n: number
}

/**
 * Run a function N times and collect timing statistics.
 * Returns average, p50, p95, p99, min, max.
 */
function benchIters<T>(n: number, fn: () => T): BenchStats {
  const times: number[] = []

  // Warmup: run a few times to warm up JIT
  for (let i = 0; i < Math.min(10, n); i++) {
    fn()
  }

  // Actual benchmark
  for (let i = 0; i < n; i++) {
    const t0 = performance.now()
    fn()
    times.push(performance.now() - t0)
  }

  times.sort((a, b) => a - b)

  const p50 = times[Math.floor(times.length * 0.5)]
  const p95 = times[Math.floor(times.length * 0.95)]
  const p99 = times[Math.floor(times.length * 0.99)]
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = times[0]
  const max = times[times.length - 1]

  return { avg, p50, p95, p99, min, max, n }
}

/**
 * Simple JSON detection based on string content.
 * Mimics the basic checks from getResult.ts without DOM.
 */
function detectJSON(s: string): boolean {
  if (!s) return false

  // Find first non-whitespace character
  const match = s.match(/[^\x20\x0a\x0d\x09]/)
  if (!match) return false

  const startChar = match[0]
  // Accept only object, array, or string JSON
  return '{["'.includes(startChar)
}

/**
 * Generate a nested object of specified size (approximate)
 */
function generateNestedObject(targetSize: number): object {
  const obj: Record<string, any> = {}
  let currentSize = 2 // {}
  let counter = 0

  while (currentSize < targetSize) {
    const key = `key_${counter}`
    const value = counter % 3 === 0
      ? `value_${counter}_with_some_content`
      : counter % 3 === 1
      ? counter
      : { nested: true, id: counter }

    obj[key] = value
    currentSize += JSON.stringify({ [key]: value }).length
    counter++
  }

  return obj
}

/**
 * Generate a large array with mixed content
 */
function generateLargeArray(targetSize: number): any[] {
  const arr: any[] = []
  let currentSize = 2 // []
  let counter = 0

  while (currentSize < targetSize) {
    const item = counter % 4 === 0
      ? { id: counter, name: `Item ${counter}`, data: [1, 2, 3] }
      : counter % 4 === 1
      ? `string_value_${counter}`
      : counter % 4 === 2
      ? counter * 1.5
      : [counter, counter + 1, counter + 2]

    arr.push(item)
    currentSize += JSON.stringify(item).length + 1 // +1 for comma
    counter++
  }

  return arr
}

describe('Detection & Parsing Microbenchmarks', () => {
  // Test data
  const nonJSON = 'This is not JSON at all'
  const smallJSON = JSON.stringify({ a: 1, b: [1, 2, 3], c: { d: 'x' } })
  const mediumJSON = JSON.stringify(generateNestedObject(20 * 1024)) // ~20KB
  const largeJSON = JSON.stringify(generateLargeArray(1024 * 1024)) // ~1MB

  describe('Detection Benchmarks', () => {
    it('detect_non_json_short', () => {
      const stats = benchIters(5000, () => detectJSON(nonJSON))

      recordMetric('detect-parse', 'detect_non_json_short', {
        avg_ms: stats.avg,
        p50_ms: stats.p50,
        p95_ms: stats.p95,
        p99_ms: stats.p99,
        min_ms: stats.min,
        max_ms: stats.max,
        iters: stats.n,
      })

      // Sanity check
      expect(detectJSON(nonJSON)).toBe(false)

      // Detection should be very fast (< 0.01ms p95)
      expect(stats.p95).toBeLessThan(0.1)
    })

    it('detect_json_small', () => {
      const stats = benchIters(5000, () => detectJSON(smallJSON))

      recordMetric('detect-parse', 'detect_json_small', {
        avg_ms: stats.avg,
        p50_ms: stats.p50,
        p95_ms: stats.p95,
        p99_ms: stats.p99,
        min_ms: stats.min,
        max_ms: stats.max,
        iters: stats.n,
      })

      // Sanity check
      expect(detectJSON(smallJSON)).toBe(true)

      // Detection should be very fast
      expect(stats.p95).toBeLessThan(0.1)
    })

    it('detect_json_medium', () => {
      const stats = benchIters(2000, () => detectJSON(mediumJSON))

      recordMetric('detect-parse', 'detect_json_medium', {
        avg_ms: stats.avg,
        p50_ms: stats.p50,
        p95_ms: stats.p95,
        p99_ms: stats.p99,
        min_ms: stats.min,
        max_ms: stats.max,
        iters: stats.n,
      })

      // Sanity check
      expect(detectJSON(mediumJSON)).toBe(true)

      // Detection should still be fast even for large strings
      expect(stats.p95).toBeLessThan(0.5)
    })

    it('detect_json_large', () => {
      const stats = benchIters(1000, () => detectJSON(largeJSON))

      recordMetric('detect-parse', 'detect_json_large', {
        avg_ms: stats.avg,
        p50_ms: stats.p50,
        p95_ms: stats.p95,
        p99_ms: stats.p99,
        min_ms: stats.min,
        max_ms: stats.max,
        iters: stats.n,
      })

      // Sanity check
      expect(detectJSON(largeJSON)).toBe(true)

      // Detection should still be reasonably fast
      expect(stats.p95).toBeLessThan(1)
    })
  })

  describe('Parsing Benchmarks', () => {
    it('parse_small', () => {
      const stats = benchIters(1000, () => JSON.parse(smallJSON))

      recordMetric('detect-parse', 'parse_small', {
        avg_ms: stats.avg,
        p50_ms: stats.p50,
        p95_ms: stats.p95,
        p99_ms: stats.p99,
        min_ms: stats.min,
        max_ms: stats.max,
        iters: stats.n,
        input_size_bytes: smallJSON.length,
      })

      // Sanity check
      const result = JSON.parse(smallJSON)
      expect(result).toHaveProperty('a', 1)
      expect(result).toHaveProperty('b')
      expect(Array.isArray(result.b)).toBe(true)

      // Small JSON should parse very quickly
      expect(stats.p95).toBeLessThan(0.1)
    })

    it('parse_medium', () => {
      const stats = benchIters(300, () => JSON.parse(mediumJSON))

      recordMetric('detect-parse', 'parse_medium', {
        avg_ms: stats.avg,
        p50_ms: stats.p50,
        p95_ms: stats.p95,
        p99_ms: stats.p99,
        min_ms: stats.min,
        max_ms: stats.max,
        iters: stats.n,
        input_size_bytes: mediumJSON.length,
      })

      // Sanity check
      const result = JSON.parse(mediumJSON)
      expect(typeof result).toBe('object')
      expect(result).not.toBeNull()

      // Medium JSON should parse reasonably fast
      expect(stats.p95).toBeLessThan(5)
    })

    it('parse_large', () => {
      const stats = benchIters(100, () => JSON.parse(largeJSON))

      recordMetric('detect-parse', 'parse_large', {
        avg_ms: stats.avg,
        p50_ms: stats.p50,
        p95_ms: stats.p95,
        p99_ms: stats.p99,
        min_ms: stats.min,
        max_ms: stats.max,
        iters: stats.n,
        input_size_bytes: largeJSON.length,
      })

      // Sanity check
      const result = JSON.parse(largeJSON)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      // Large JSON will take longer but should still be reasonable
      // V8's JSON parser is highly optimized
      expect(stats.p95).toBeLessThan(100)
    })
  })

  describe('Edge Cases', () => {
    it('parse_empty_object', () => {
      const emptyObj = '{}'
      const stats = benchIters(5000, () => JSON.parse(emptyObj))

      recordMetric('detect-parse', 'parse_empty_object', {
        avg_ms: stats.avg,
        p50_ms: stats.p50,
        p95_ms: stats.p95,
        p99_ms: stats.p99,
        min_ms: stats.min,
        max_ms: stats.max,
        iters: stats.n,
        input_size_bytes: emptyObj.length,
      })

      expect(JSON.parse(emptyObj)).toEqual({})
      expect(stats.p95).toBeLessThan(0.05)
    })

    it('parse_empty_array', () => {
      const emptyArr = '[]'
      const stats = benchIters(5000, () => JSON.parse(emptyArr))

      recordMetric('detect-parse', 'parse_empty_array', {
        avg_ms: stats.avg,
        p50_ms: stats.p50,
        p95_ms: stats.p95,
        p99_ms: stats.p99,
        min_ms: stats.min,
        max_ms: stats.max,
        iters: stats.n,
        input_size_bytes: emptyArr.length,
      })

      expect(JSON.parse(emptyArr)).toEqual([])
      expect(stats.p95).toBeLessThan(0.05)
    })

    it('parse_deeply_nested', () => {
      // Create a deeply nested structure
      let nested: any = { value: 42 }
      for (let i = 0; i < 50; i++) {
        nested = { child: nested }
      }
      const deepJSON = JSON.stringify(nested)

      const stats = benchIters(500, () => JSON.parse(deepJSON))

      recordMetric('detect-parse', 'parse_deeply_nested', {
        avg_ms: stats.avg,
        p50_ms: stats.p50,
        p95_ms: stats.p95,
        p99_ms: stats.p99,
        min_ms: stats.min,
        max_ms: stats.max,
        iters: stats.n,
        input_size_bytes: deepJSON.length,
        nesting_depth: 50,
      })

      const result = JSON.parse(deepJSON)
      expect(result).toHaveProperty('child')
    })

    it('parse_wide_object', () => {
      // Create an object with many keys at the same level
      const wideObj: Record<string, number> = {}
      for (let i = 0; i < 1000; i++) {
        wideObj[`key_${i}`] = i
      }
      const wideJSON = JSON.stringify(wideObj)

      const stats = benchIters(300, () => JSON.parse(wideJSON))

      recordMetric('detect-parse', 'parse_wide_object', {
        avg_ms: stats.avg,
        p50_ms: stats.p50,
        p95_ms: stats.p95,
        p99_ms: stats.p99,
        min_ms: stats.min,
        max_ms: stats.max,
        iters: stats.n,
        input_size_bytes: wideJSON.length,
        key_count: 1000,
      })

      const result = JSON.parse(wideJSON)
      expect(Object.keys(result).length).toBe(1000)
    })
  })

  describe('Benchmark Metadata', () => {
    it('should report test data sizes', () => {
      // This test just reports the sizes for reference
      const sizes = {
        small: smallJSON.length,
        medium: mediumJSON.length,
        large: largeJSON.length,
      }

      recordMetric('detect-parse', 'test_data_sizes', {
        small_bytes: sizes.small,
        medium_bytes: sizes.medium,
        large_bytes: sizes.large,
      })

      // Verify sizes are in expected ranges
      expect(sizes.small).toBeLessThan(1000)
      expect(sizes.medium).toBeGreaterThan(10 * 1024)
      expect(sizes.medium).toBeLessThan(30 * 1024)
      expect(sizes.large).toBeGreaterThan(500 * 1024)
      expect(sizes.large).toBeLessThan(2 * 1024 * 1024)
    })
  })
})
