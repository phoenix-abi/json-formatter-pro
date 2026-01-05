import { describe, it, expect } from 'vitest'
import { compare } from '../../scripts/compare-perf.mjs'

describe('Performance Baseline Comparator', () => {
  describe('compare()', () => {
    it('should pass when metrics are within tolerance', () => {
      const baseline = {
        tolerance: {
          default: { pct: 0.07, abs_ms: 2 },
        },
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 10, p50_ms: 9, p95_ms: 12 },
            n: 100,
          },
        ],
      }

      const report = {
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 10.5, p50_ms: 9.3, p95_ms: 12.5 },
            n: 100,
          },
        ],
      }

      const { results, hasFailures } = compare({ baseline, report })

      expect(hasFailures).toBe(false)
      expect(results).toHaveLength(1)
      expect(results[0].metrics.avg_ms.status).toBe('PASS')
      expect(results[0].metrics.p50_ms.status).toBe('PASS')
      expect(results[0].metrics.p95_ms.status).toBe('PASS')
    })

    it('should fail when percentage threshold is exceeded AND absolute threshold is exceeded', () => {
      const baseline = {
        tolerance: {
          default: { pct: 0.07, abs_ms: 2 },
        },
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 10 },
            n: 100,
          },
        ],
      }

      const report = {
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 13 }, // +30% AND +3ms - both thresholds exceeded
            n: 100,
          },
        ],
      }

      const { results, hasFailures } = compare({ baseline, report })

      expect(hasFailures).toBe(true)
      expect(results[0].metrics.avg_ms.status).toBe('FAIL')
      expect(parseFloat(results[0].metrics.avg_ms.deltaPct)).toBeCloseTo(30, 0)
    })

    it('should pass when percentage is high but absolute diff is small', () => {
      const baseline = {
        tolerance: {
          default: { pct: 0.07, abs_ms: 2 },
        },
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 0.001 }, // Very small baseline
            n: 100,
          },
        ],
      }

      const report = {
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 0.002 }, // 100% increase but only 0.001ms absolute
            n: 100,
          },
        ],
      }

      const { results, hasFailures } = compare({ baseline, report })

      expect(hasFailures).toBe(false)
      expect(results[0].metrics.avg_ms.status).toBe('PASS')
    })

    it('should pass when absolute diff is high but percentage is small', () => {
      const baseline = {
        tolerance: {
          default: { pct: 0.07, abs_ms: 2 },
        },
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 100 },
            n: 100,
          },
        ],
      }

      const report = {
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 103 }, // Only 3% increase
            n: 100,
          },
        ],
      }

      const { results, hasFailures } = compare({ baseline, report })

      expect(hasFailures).toBe(false)
      expect(results[0].metrics.avg_ms.status).toBe('PASS')
    })

    it('should use interaction-specific tolerance for interaction suites', () => {
      const baseline = {
        tolerance: {
          default: { pct: 0.07, abs_ms: 2 },
          interaction: { pct: 0.07, abs_ms: 15 },
        },
        samples: [
          {
            suite: 'interaction',
            case: 'expand-test',
            metrics: { avg_ms: 10 },
            n: 50,
          },
        ],
      }

      const report = {
        samples: [
          {
            suite: 'interaction',
            case: 'expand-test',
            metrics: { avg_ms: 21 }, // +110% AND +11ms - exceeds pct but not abs_ms (15)
            n: 50,
          },
        ],
      }

      const { results, hasFailures } = compare({ baseline, report })

      expect(hasFailures).toBe(false) // Within abs_ms threshold for interactions
      expect(results[0].metrics.avg_ms.status).toBe('PASS')
    })

    it('should warn about baseline cases missing in report', () => {
      const baseline = {
        tolerance: { default: { pct: 0.07, abs_ms: 2 } },
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case-1',
            metrics: { avg_ms: 10 },
            n: 100,
          },
          {
            suite: 'test-suite',
            case: 'test-case-2',
            metrics: { avg_ms: 20 },
            n: 100,
          },
        ],
      }

      const report = {
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case-1',
            metrics: { avg_ms: 10.5 },
            n: 100,
          },
          // test-case-2 is missing
        ],
      }

      const { warnings } = compare({ baseline, report })

      expect(warnings).toContain('Baseline test case missing in report: test-suite|test-case-2')
    })

    it('should warn about new test cases in report not in baseline', () => {
      const baseline = {
        tolerance: { default: { pct: 0.07, abs_ms: 2 } },
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case-1',
            metrics: { avg_ms: 10 },
            n: 100,
          },
        ],
      }

      const report = {
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case-1',
            metrics: { avg_ms: 10.5 },
            n: 100,
          },
          {
            suite: 'test-suite',
            case: 'test-case-2', // New test not in baseline
            metrics: { avg_ms: 20 },
            n: 100,
          },
        ],
      }

      const { warnings } = compare({ baseline, report })

      expect(warnings).toContain('New test case not in baseline: test-suite|test-case-2')
    })

    it('should skip comparison for metrics with zero baseline value', () => {
      const baseline = {
        tolerance: { default: { pct: 0.07, abs_ms: 2 } },
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 0, p50_ms: 10 },
            n: 100,
          },
        ],
      }

      const report = {
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 5, p50_ms: 10.5 },
            n: 100,
          },
        ],
      }

      const { results } = compare({ baseline, report })

      expect(results[0].metrics).not.toHaveProperty('avg_ms') // Skipped due to zero baseline
      expect(results[0].metrics).toHaveProperty('p50_ms')
      expect(results[0].metrics.p50_ms.status).toBe('PASS')
    })

    it('should apply tolerance overrides', () => {
      const baseline = {
        tolerance: {
          default: { pct: 0.07, abs_ms: 2 },
        },
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 10 },
            n: 100,
          },
        ],
      }

      const report = {
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 13 }, // +30% AND +3ms
            n: 100,
          },
        ],
      }

      // Without override - should fail
      const result1 = compare({ baseline, report })
      expect(result1.hasFailures).toBe(true)

      // With override - should pass
      const result2 = compare({
        baseline,
        report,
        toleranceOverrides: { pct: 0.35, abs_ms: 5 }, // 35% and 5ms tolerance
      })
      expect(result2.hasFailures).toBe(false)
    })

    it('should handle reports with no samples', () => {
      const baseline = {
        tolerance: { default: { pct: 0.07, abs_ms: 2 } },
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 10 },
            n: 100,
          },
        ],
      }

      const report = {
        samples: [],
      }

      const { results, warnings, hasFailures } = compare({ baseline, report })

      expect(results).toHaveLength(0)
      expect(hasFailures).toBe(false)
      expect(warnings).toContain('Baseline test case missing in report: test-suite|test-case')
    })

    it('should handle negative regressions (improvements)', () => {
      const baseline = {
        tolerance: { default: { pct: 0.07, abs_ms: 2 } },
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 10 },
            n: 100,
          },
        ],
      }

      const report = {
        samples: [
          {
            suite: 'test-suite',
            case: 'test-case',
            metrics: { avg_ms: 8 }, // Improvement
            n: 100,
          },
        ],
      }

      const { results, hasFailures } = compare({ baseline, report })

      expect(hasFailures).toBe(false)
      expect(results[0].metrics.avg_ms.status).toBe('PASS')
      expect(results[0].metrics.avg_ms.delta).toBeLessThan(0)
      expect(parseFloat(results[0].metrics.avg_ms.deltaPct)).toBeCloseTo(-20, 0)
    })
  })
})
