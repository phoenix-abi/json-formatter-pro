import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { peek, reset, appendSample } from './collector'

describe('Performance Reporter', () => {
  beforeEach(() => {
    // Reset collector before each test
    reset()
  })

  afterEach(() => {
    // Clean up
    reset()
  })

  describe('peek()', () => {
    it('should return null when no samples exist', () => {
      const data = peek()
      expect(data).toBeNull()
    })

    it('should return data structure when samples exist', () => {
      appendSample({
        suite: 'test-suite',
        case: 'test-case',
        metrics: { avg_ms: 1.5, p50_ms: 1.4, p95_ms: 1.8 },
        n: 100,
      })

      const data = peek()

      expect(data).not.toBeNull()
      expect(data).toHaveProperty('env')
      expect(data).toHaveProperty('samples')
      expect(data?.samples).toHaveLength(1)
      expect(data?.samples[0]).toMatchObject({
        suite: 'test-suite',
        case: 'test-case',
        metrics: { avg_ms: 1.5, p50_ms: 1.4, p95_ms: 1.8 },
        n: 100,
      })
    })

    it('should include environment metadata', () => {
      appendSample({
        suite: 'test',
        case: 'test',
        metrics: { ms: 1 },
        n: 1,
      })

      const data = peek()

      expect(data?.env).toHaveProperty('node')
      expect(data?.env).toHaveProperty('os')
      expect(data?.env).toHaveProperty('cpu')
      expect(data?.env).toHaveProperty('ci')
    })

    it('should not mutate collector state', () => {
      appendSample({
        suite: 'test',
        case: 'test',
        metrics: { ms: 1 },
        n: 1,
      })

      const data1 = peek()
      const data2 = peek()

      expect(data1?.samples).toHaveLength(1)
      expect(data2?.samples).toHaveLength(1)
      expect(data1).toEqual(data2)
    })

    it('should return multiple samples', () => {
      appendSample({
        suite: 'suite1',
        case: 'case1',
        metrics: { ms: 1 },
        n: 10,
      })
      appendSample({
        suite: 'suite1',
        case: 'case2',
        metrics: { ms: 2 },
        n: 20,
      })
      appendSample({
        suite: 'suite2',
        case: 'case1',
        metrics: { ms: 3 },
        n: 30,
      })

      const data = peek()

      expect(data?.samples).toHaveLength(3)
      expect(data?.samples.map(s => s.suite)).toEqual([
        'suite1',
        'suite1',
        'suite2',
      ])
    })
  })

  describe('Reporter Integration', () => {
    it('should handle typical benchmark scenario', () => {
      // Simulate a typical perf test run
      appendSample({
        suite: 'render-buildDom',
        case: 'render_primitive_number',
        metrics: {
          avg_ms: 0.015,
          p50_ms: 0.013,
          p95_ms: 0.021,
          p99_ms: 0.025,
          min_ms: 0.011,
          max_ms: 0.032,
        },
        n: 500,
      })

      appendSample({
        suite: 'render-buildDom',
        case: 'render_array_small',
        metrics: {
          avg_ms: 0.18,
          p50_ms: 0.16,
          p95_ms: 0.22,
          p99_ms: 0.28,
          min_ms: 0.14,
          max_ms: 0.35,
          array_length: 10,
        },
        n: 200,
      })

      appendSample({
        suite: 'detect-parse',
        case: 'parse_small',
        metrics: {
          avg_ms: 0.0005,
          p50_ms: 0.0004,
          p95_ms: 0.0007,
          p99_ms: 0.0009,
          min_ms: 0.0003,
          max_ms: 0.0012,
          input_size_bytes: 150,
        },
        n: 1000,
      })

      const data = peek()

      expect(data?.samples).toHaveLength(3)

      // Verify structure
      data?.samples.forEach(sample => {
        expect(sample).toHaveProperty('suite')
        expect(sample).toHaveProperty('case')
        expect(sample).toHaveProperty('metrics')
        expect(sample).toHaveProperty('n')
        expect(typeof sample.n).toBe('number')
        expect(sample.n).toBeGreaterThan(0)
      })

      // Verify metrics have expected fields
      expect(data?.samples[0].metrics).toHaveProperty('avg_ms')
      expect(data?.samples[0].metrics).toHaveProperty('p50_ms')
      expect(data?.samples[0].metrics).toHaveProperty('p95_ms')
    })

    it('should handle edge case with minimal metrics', () => {
      appendSample({
        suite: 'test',
        case: 'minimal',
        metrics: { ms: 0.1 },
        n: 1,
      })

      const data = peek()

      expect(data?.samples).toHaveLength(1)
      expect(data?.samples[0].metrics).toHaveProperty('ms', 0.1)
    })

    it('should handle extra metadata in metrics', () => {
      appendSample({
        suite: 'interaction',
        case: 'expand_large_array',
        metrics: {
          avg_ms: 15.5,
          p50_ms: 14.2,
          p95_ms: 18.7,
          array_length: 1000,
          depth: 3,
          sibling_count: 50,
        },
        n: 30,
      })

      const data = peek()

      expect(data?.samples[0].metrics).toMatchObject({
        avg_ms: 15.5,
        p50_ms: 14.2,
        p95_ms: 18.7,
        array_length: 1000,
        depth: 3,
        sibling_count: 50,
      })
    })
  })

  describe('Reporter Error Handling', () => {
    it('should handle empty state gracefully', () => {
      const data = peek()
      expect(data).toBeNull()

      // Reporter should handle this without throwing
      expect(() => {
        if (!data || !data.samples || data.samples.length === 0) {
          // No-op, which is correct behavior
        }
      }).not.toThrow()
    })

    it('should handle samples with missing optional metrics', () => {
      appendSample({
        suite: 'test',
        case: 'incomplete',
        metrics: {
          avg_ms: 1.0,
          // Missing p50, p95, etc.
        },
        n: 10,
      })

      const data = peek()

      expect(data?.samples[0].metrics).toHaveProperty('avg_ms')
      expect(data?.samples[0].metrics.p50_ms).toBeUndefined()
    })
  })
})
