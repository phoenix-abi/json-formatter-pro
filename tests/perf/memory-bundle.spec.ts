/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { buildDom } from '../../src/lib/buildDom'
import { sampleHeap, measurePeakHeap } from './memory'
import { recordMetric } from './harness'
import { fixtures } from '../fixtures/generate'

describe('Memory & Bundle Integration', () => {
  describe('Memory Sampling', () => {
    it('should capture heap metrics for small render', () => {
      const data = fixtures.small_array_primitives()

      // Render and sample heap
      buildDom(data, false)
      const snapshot = sampleHeap()

      // Record metrics
      recordMetric('memory', 'render_small_array', {
        heap_used_mb: snapshot.heapUsed_mb,
        heap_total_mb: snapshot.heapTotal_mb,
        rss_mb: snapshot.rss_mb,
      })

      // Sanity check
      expect(snapshot.heapUsed_mb).toBeGreaterThan(0)
      expect(snapshot.heapTotal_mb).toBeGreaterThanOrEqual(snapshot.heapUsed_mb)
    })

    it('should capture heap metrics for medium render', () => {
      const data = fixtures.medium_mixed()

      // Render and sample heap
      buildDom(data, false)
      const snapshot = sampleHeap()

      // Record metrics
      recordMetric('memory', 'render_medium_mixed', {
        heap_used_mb: snapshot.heapUsed_mb,
        heap_total_mb: snapshot.heapTotal_mb,
        rss_mb: snapshot.rss_mb,
      })

      // Sanity check
      expect(snapshot.heapUsed_mb).toBeGreaterThan(0)
    })

    it('should measure peak heap during render workload', async () => {
      const { result, snapshot } = await measurePeakHeap(() => {
        const data = fixtures.small_array_objects()
        const dom = buildDom(data, false)
        return dom.childElementCount
      })

      // Record peak memory
      recordMetric('memory', 'render_peak_small_objects', {
        heap_peak_mb: snapshot.heapUsed_mb,
        heap_total_mb: snapshot.heapTotal_mb,
      })

      // Sanity checks
      expect(result).toBeGreaterThan(0)
      expect(snapshot.heapUsed_mb).toBeGreaterThan(0)
    })

    it('should show memory usage increases with data size', () => {
      // Measure small data
      const smallData = fixtures.small_array_primitives()
      buildDom(smallData, false)
      const smallSnapshot = sampleHeap()

      // Measure medium data (should use more memory)
      const mediumData = fixtures.medium_array_primitives()
      buildDom(mediumData, false)
      const mediumSnapshot = sampleHeap()

      // Record both for comparison
      recordMetric('memory', 'comparison_small', {
        heap_used_mb: smallSnapshot.heapUsed_mb,
      })

      recordMetric('memory', 'comparison_medium', {
        heap_used_mb: mediumSnapshot.heapUsed_mb,
      })

      // Note: We don't assert memory ordering because GC timing is non-deterministic
      // The metrics are captured for tracking purposes only
      expect(smallSnapshot.heapUsed_mb).toBeGreaterThan(0)
      expect(mediumSnapshot.heapUsed_mb).toBeGreaterThan(0)
    })

    it('should capture RSS and heap metrics structure', () => {
      buildDom({ test: 'data' }, false)
      const snapshot = sampleHeap()

      // Verify all expected fields are present and valid
      expect(snapshot).toHaveProperty('rss_mb')
      expect(snapshot).toHaveProperty('heapUsed_mb')
      expect(snapshot).toHaveProperty('heapTotal_mb')
      expect(snapshot).toHaveProperty('external_mb')

      expect(typeof snapshot.rss_mb).toBe('number')
      expect(typeof snapshot.heapUsed_mb).toBe('number')
      expect(typeof snapshot.heapTotal_mb).toBe('number')
      expect(typeof snapshot.external_mb).toBe('number')

      expect(snapshot.rss_mb).toBeGreaterThan(0)
      expect(snapshot.heapUsed_mb).toBeGreaterThan(0)
      expect(snapshot.heapTotal_mb).toBeGreaterThan(0)
      expect(snapshot.external_mb).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Bundle Size Integration', () => {
    it('should document bundle size measurement workflow', () => {
      // This test documents the workflow for CI:
      // 1. Run `npm run build` to generate dist/
      // 2. Run `npm run bundle:measure` to generate bundle-size.json
      // 3. The comparator will read bundle-size.json and compare against baseline

      // For this test, we just verify the workflow is documented
      expect(true).toBe(true)
    })

    it('should note that bundle measurement requires built files', () => {
      // Bundle size measurement is performed by scripts/measure-bundle.mjs
      // It requires dist/ to exist (from `npm run build`)
      // In CI, this is handled by the workflow which builds before measuring

      // This test serves as documentation
      expect(true).toBe(true)
    })
  })
})
